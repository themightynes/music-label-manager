/**
 * ProjectStageProcessor — weekly project stage-machine advancement.
 *
 * Phase 2 engine-seams §2 row 6. VERBATIM move of `GameEngine.advanceProjectStages`
 * (the planning → production → recorded stage machine, incl. the Mini-Tour city
 * cadence and the ≥2-week / ≥4-week recording gates). Every log line, branch, gate
 * threshold, summary mutation, and storage/tx call is preserved character-for-
 * character. Only `this.` is rebound to the injected `WeekContext`
 * (`this.gameState` → `ctx.gameState`, `this.storage` → `ctx.storage`) and the
 * tour-revenue call is made against a `TourProcessor` directly (the engine's
 * `processUnifiedTourRevenue` delegate was just a `new TourProcessor().…(ctx, …)`
 * wrapper, so calling the processor here is the SAME behavior with no engine
 * round-trip).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RNG INVARIANT (see ./types.ts): the only RNG in this pipeline step is the
 * ±20% tour-attendance variance draw inside `TourProcessor.processUnifiedTourRevenue`
 * (`ctx.getRandom(0, 1)`), which flows through the engine's single seeded stream
 * via `ctx`. The stage machine itself makes NO RNG draws — advancement is purely
 * time/song-count driven — so draw order is unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The hardcoded week gates (planning→production at weeksElapsed≥0, recording
 * completion at ≥2 weeks with all songs OR ≥4 weeks max) STAY hardcoded — moving
 * them to config is Phase 4 material (see plan §2 row 6).
 *
 * B6 (D3) NOTE: the old no-op `processNewlyRecordedProjects` /
 * `processProjectSongRecording` pass was DELETED in this PR; its
 * "recording completed — ready for release" summary notification is now fired
 * from `SongGenerationProcessor.generateWeeklyProjectSongs` at the moment a
 * project's last song is generated. This processor is unaffected by that change.
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * `advanceProjectStages` reads projects DIRECTLY off `ctx.dbTransaction` (mirrors
 * the pre-extraction engine, which required the tx and early-returned without one).
 */
import type { WeekContext } from './types';
import type { WeekSummary } from '../../types/gameTypes';
import { TourProcessor } from './TourProcessor';

export class ProjectStageProcessor {
  async advanceProjectStages(ctx: WeekContext, summary: WeekSummary, dbTransaction?: any): Promise<void> {
    if (!dbTransaction) {
      console.warn('[PROJECT ADVANCEMENT] No database transaction provided - cannot advance project stages');
      return;
    }

    console.log(`[PROJECT ADVANCEMENT] Current month: ${ctx.gameState.currentWeek}`);

    try {
      // Import the required modules dynamically to avoid circular dependencies
      const { projects } = await import('../../schema');
      const { eq } = await import('drizzle-orm');

      // Get all projects for this game
      const projectList = await dbTransaction
        .select()
        .from(projects)
        .where(eq(projects.gameId, ctx.gameState.id));

      console.log(`[PROJECT ADVANCEMENT] Found ${projectList.length} projects to evaluate`);

      for (const project of projectList) {
        const stages = ['planning', 'production', 'recorded'];
        const currentStageIndex = stages.indexOf(project.stage || 'planning');
        const weeksElapsed = (ctx.gameState.currentWeek || 1) - (project.startWeek || 1);
        const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
        const songCount = project.songCount || 1;
        const songsCreated = project.songsCreated || 0;
        const allSongsCreated = songsCreated >= songCount;

        console.log(`[PROJECT ADVANCEMENT] Evaluating ${project.title}:`, {
          currentStage: project.stage,
          currentStageIndex,
          weeksElapsed,
          isRecordingProject,
          songCount,
          songsCreated,
          allSongsCreated
        });

        let newStageIndex = currentStageIndex;
        let advancementReason = '';

        // Stage advancement logic
        if (currentStageIndex === 0 && weeksElapsed >= 0) {
          // planning -> production (simple time-based)
          newStageIndex = 1;
          advancementReason = `Planning complete after ${weeksElapsed} week${weeksElapsed > 1 ? 's' : ''}`;

          // NOTE: Project costs are now deducted immediately upon creation (see routes.ts)
          // This prevents timing exploits where users cancel before week advance
          // We track the expense for weekly reporting but DON'T deduct money again
          if (project.totalCost) {
            // DO NOT add to summary.expenses - money already deducted at creation!
            // summary.expenses += project.totalCost; // <-- REMOVED to fix double-charging bug

            if (!summary.expenseBreakdown) {
              summary.expenseBreakdown = {
                weeklyOperations: 0,
                artistSalaries: 0,
                executiveSalaries: 0,
                signingBonuses: 0,
                projectCosts: 0,
                marketingCosts: 0,
                roleMeetingCosts: 0
              };
            }
            // Track for reporting but don't affect final money calculation
            summary.expenseBreakdown!.projectCosts += project.totalCost;

            summary.changes.push({
              type: 'expense_tracking',
              description: `${project.title} production started (cost previously deducted at creation)`,
              amount: -project.totalCost,
              projectId: project.id
            });
          }

          // Tour-tier1 slice 1: planning-week foreshadow for tours. Deterministic
          // (no getRandom draw — see TourProcessor.estimatePlanningForeshadow) so
          // the seeded stream is untouched and this stays byte-identical to the
          // eventual city-1 reveal's pre-variance numbers.
          if (project.type === 'Mini-Tour') {
            try {
              const artist = await ctx.gameData.getArtistById(project.artistId);
              const fore = TourProcessor.estimatePlanningForeshadow(ctx, project, artist);
              const artistName = artist?.name;
              summary.changes.push({
                type: 'tour_planning',
                description: `🎤 ${project.title}: crew booked — ${artistName ?? 'the artist'} plays ${fore.venue} next week (${fore.estTickets.toLocaleString()} of ${fore.capacity.toLocaleString()} tickets expected)`,
                amount: 0,
                projectId: project.id,
                venue: fore.venue,
                capacity: fore.capacity,
                estTickets: fore.estTickets,
                cityNumber: 1,
                citiesTotal: fore.citiesTotal,
                artistId: project.artistId,
                artistName
              });
            } catch (error) {
              console.error(`[TOUR FORESHADOW] Failed to build planning foreshadow for "${project.title}":`, error);
            }
          }
        } else if (currentStageIndex === 1) {
          // production -> marketing/completed
          if (!isRecordingProject && project.type === 'Mini-Tour') {
            // Enhanced tour logic: 1 week per city + planning week
            const citiesPlanned = project.metadata?.cities || 1;
            const weeksInProduction = weeksElapsed - 1; // Subtract planning week

            if (weeksInProduction >= citiesPlanned) {
              // Final city: process its revenue AND complete in the SAME pass
              // (tour-tier1 slice 1 — kills the phantom bookkeeping week that used
              // to detect completion only on the NEXT advance). Fall through to a
              // pure completion when weeksInProduction has already passed the
              // final city (legacy in-flight saves that predate this fix).
              let tourStats = project.metadata?.tourStats;
              if (weeksInProduction === citiesPlanned && weeksInProduction > 0) {
                // processUnifiedTourRevenue returns the UPDATED tourStats
                // (including this final city) — the project row fetched at loop
                // start is stale and would miss it, so use the return value for
                // the completion totals below.
                tourStats = await new TourProcessor().processUnifiedTourRevenue(ctx, project, weeksInProduction, dbTransaction);
              }

              // Tour complete - skip marketing, go directly to completed
              newStageIndex = 2; // Go directly to 'recorded' which acts as 'completed' for tours
              advancementReason = `Tour completed after ${citiesPlanned} cities (${weeksElapsed} total weeks)`;

              // Generate final tour completion summary
              if (tourStats && tourStats.cities) {
                const totalRevenue = tourStats.cities.reduce((sum: number, city: any) => sum + (city?.revenue || 0), 0);
                const avgAttendance = Math.round(tourStats.cities.reduce((sum: number, city: any) => sum + (city?.attendanceRate || 0), 0) / tourStats.cities.length);

                // C68/#12: net out the tour's total costs so the completion
                // summary + email report ACTUAL profit/loss, not just top-line
                // gross. Per-city costs (venue + production + marketing) were
                // stored at pre-calculation time in economics.costs.total; sum
                // them for the whole tour. Fallback: if the per-city cost
                // breakdown is missing (legacy/partial data), derive tour costs
                // from the project's committed spend (totalCost).
                const totalCosts = tourStats.cities.reduce(
                  (sum: number, city: any) => sum + (city?.economics?.costs?.total ?? 0),
                  0
                ) || (project.totalCost || 0);
                const netProfit = totalRevenue - totalCosts;

                // Save total revenue for ROI calculation
                if (ctx.storage?.updateProject) {
                  await ctx.storage.updateProject(project.id, {
                    totalRevenue,
                    completionStatus: 'completed'
                  }, dbTransaction);
                }

                const profitLabel = netProfit >= 0 ? 'net profit' : 'net loss';
                summary.changes.push({
                  type: 'project_complete',
                  description: `${project.title} tour completed - ${tourStats.cities.length} cities, ${avgAttendance}% avg attendance, $${totalRevenue.toLocaleString()} gross, $${netProfit.toLocaleString()} ${profitLabel}`,
                  amount: 0, // Revenue already counted weekly
                  projectId: project.id,
                  grossRevenue: totalRevenue,
                  totalCosts,
                  netProfit
                });
              }
            } else if (weeksInProduction > 0) {
              // Process this week's city performance using unified system
              await new TourProcessor().processUnifiedTourRevenue(ctx, project, weeksInProduction, dbTransaction);
            }
          } else if (!isRecordingProject) {
            // Other non-recording projects - simple time-based
            if (weeksElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `Production complete after ${weeksElapsed} weeks`;
            }
          } else {
            // Recording projects - need all songs OR max 4 weeks
            if (allSongsCreated && weeksElapsed >= 2) {
              newStageIndex = 2;
              advancementReason = `All ${songsCreated} songs completed after ${weeksElapsed} weeks`;
            } else if (weeksElapsed >= 4) {
              newStageIndex = 2;
              advancementReason = `Maximum production time reached (${weeksElapsed} weeks, ${songsCreated}/${songCount} songs)`;
            }
          }
        }

        // Advance stage if needed
        if (newStageIndex > currentStageIndex) {
          const newStage = stages[newStageIndex];
          console.log(`[PROJECT ADVANCEMENT] Advancing ${project.title}: ${project.stage} -> ${newStage} (${advancementReason})`);

          // Prepare update data
          const updateData: any = {
            stage: newStage,
            quality: Math.min(100, (project.quality || 0) + 25)
          };

          // If advancing to recorded stage, track recording completion metadata
          if (newStage === 'recorded') {
            const existingMetadata = project.metadata || {};
            updateData.metadata = {
              ...existingMetadata,
              recordingCompletedWeek: ctx.gameState.currentWeek,
              recordedAt: new Date().toISOString(),
              advancementReason
            };
            console.log(`[PROJECT ADVANCEMENT] Marking project "${project.title}" as recording completed in week ${ctx.gameState.currentWeek}`);
          }

          // Update project in database
          await dbTransaction
            .update(projects)
            .set(updateData)
            .where(eq(projects.id, project.id));

          // Add to summary
          // C68: tours reuse the recording stage machine internally (their
          // "completed" state IS the `recorded` stage index), but the recording
          // pipeline's stage NAMES ("recorded") must not leak into tour-facing
          // milestone copy. Branch the player-facing stage label on project type:
          // tours progress Planned → On Tour → Tour Completed, recordings keep
          // the writing/production/recorded pipeline names.
          const isTourProject = project.type === 'Mini-Tour';
          const description = isTourProject
            ? `📈 ${project.title}: ${({ planning: 'Tour Planned', production: 'On Tour', recorded: 'Tour Completed' } as Record<string, string>)[newStage] ?? newStage} — ${advancementReason}`
            : `📈 ${project.title} advanced to ${newStage} stage: ${advancementReason}`;
          summary.changes.push({
            type: 'unlock',
            description,
            amount: 0
          });

          console.log(`[PROJECT ADVANCEMENT] Successfully advanced "${project.title}" to ${newStage}`);
        } else {
          console.log(`[PROJECT ADVANCEMENT] ${project.title} staying in ${project.stage} (${weeksElapsed} weeks elapsed)`);
        }
      }

    } catch (error) {
      console.error('[PROJECT ADVANCEMENT] Error during project advancement:', error);
      throw new Error(`Project advancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
