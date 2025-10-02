import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitBugReport } from "@/services/bugReportService";
import { BugReportRequestSchema, bugAreaEnum, bugFrequencyEnum, bugSeverityEnum, type BugReportRequest } from "@shared/api/contracts";
import { ZodError } from "zod";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string | null;
  currentWeek?: number | null;
  defaultContactEmail?: string | null;
}

type FormErrors = Partial<Record<keyof BugReportRequest, string>> & {
  whatHappened?: string;
};

const severityOptions = bugSeverityEnum.options;
const areaOptions = bugAreaEnum.options;
const frequencyOptions = bugFrequencyEnum.options;

export function BugReportModal({
  open,
  onOpenChange,
  gameId,
  currentWeek,
  defaultContactEmail
}: BugReportModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    summary: "",
    severity: severityOptions[1] ?? "medium",
    area: areaOptions[0] ?? "gameplay",
    frequency: frequencyOptions[1] ?? "intermittent",
    whatHappened: "",
    stepsToReproduce: "",
    expectedResult: "",
    additionalContext: "",
    contactEmail: defaultContactEmail ?? ""
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setFormValues((prev) => ({
        ...prev,
        contactEmail: prev.contactEmail || defaultContactEmail || ""
      }));
    } else {
      setFormValues({
        summary: "",
        severity: severityOptions[1] ?? "medium",
        area: areaOptions[0] ?? "gameplay",
        frequency: frequencyOptions[1] ?? "intermittent",
        whatHappened: "",
        stepsToReproduce: "",
        expectedResult: "",
        additionalContext: "",
        contactEmail: defaultContactEmail ?? ""
      });
      setErrors({});
    }
  }, [open, defaultContactEmail]);

  const metadata = useMemo(() => {
    if (typeof window === "undefined") {
      return {} as BugReportRequest["metadata"];
    }

    return {
      gameId: gameId ?? undefined,
      currentWeek: currentWeek ?? undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
      language: typeof navigator !== "undefined" ? navigator.language : undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: window.location.href,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    } satisfies NonNullable<BugReportRequest["metadata"]>;
  }, [currentWeek, gameId]);

  const handleChange = (field: keyof typeof formValues) => (value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: ""
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = BugReportRequestSchema.parse({
        ...formValues,
        stepsToReproduce: formValues.stepsToReproduce?.trim() || undefined,
        expectedResult: formValues.expectedResult?.trim() || undefined,
        additionalContext: formValues.additionalContext?.trim() || undefined,
        contactEmail: formValues.contactEmail?.trim() || undefined,
        whatHappened: formValues.whatHappened.trim(),
        summary: formValues.summary.trim(),
        metadata
      });

      await submitBugReport(payload);

      toast({
        title: "Bug report submitted",
        description: "Thanks! Your report helps us stabilize the game."
      });

      onOpenChange(false);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.flatten().fieldErrors;
        const fieldErrors: FormErrors = {};
        for (const [key, value] of Object.entries(issues)) {
          if (!value || value.length === 0) continue;
          const fieldKey = key as keyof FormErrors;
          fieldErrors[fieldKey] = value[0] ?? "Invalid value";
        }
        setErrors(fieldErrors);
      } else {
        console.error("Failed to submit bug report", error);
        toast({
          title: "Failed to submit bug",
          description: "Something went wrong. Please try again in a moment.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-xl bg-[#23121c] border-[#4e324c] text-white">
        <DialogHeader className="border-b border-[#4e324c] pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Bug className="h-5 w-5 text-[#A75A5B]" />
            Report a Bug
          </DialogTitle>
          <DialogDescription className="text-xs text-white/70">
            Share what went wrong so we can fix it quickly. The more detail you include, the faster we can reproduce it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bug-summary" className="text-sm text-gray-200">
                Short summary <span className="text-[#A75A5B]">*</span>
              </Label>
              <Input
                id="bug-summary"
                value={formValues.summary}
                onChange={(event) => handleChange("summary")(event.target.value)}
                placeholder="e.g. Artist roster fails to load"
                className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40"
                disabled={isSubmitting}
              />
              {errors.summary && <p className="text-xs text-red-400">{errors.summary}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-200">
                Severity <span className="text-[#A75A5B]">*</span>
              </Label>
              <Select value={formValues.severity} onValueChange={handleChange("severity")} disabled={isSubmitting}>
                <SelectTrigger className="bg-[#2C222A] border-[#4e324c] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2C222A] border-[#4e324c]">
                  {severityOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-white">
                      {option === "low" && "Low — Cosmetic or minor inconvenience"}
                      {option === "medium" && "Medium — Disruptive but workaround exists"}
                      {option === "high" && "High — Blocks progress or causes data loss"}
                      {option === "critical" && "Critical — Game-breaking or crashes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.severity && <p className="text-xs text-red-400">{errors.severity}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-200">
                Where you saw it <span className="text-[#A75A5B]">*</span>
              </Label>
              <Select value={formValues.area} onValueChange={handleChange("area")} disabled={isSubmitting}>
                <SelectTrigger className="bg-[#2C222A] border-[#4e324c] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2C222A] border-[#4e324c]">
                  {areaOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-white">
                      {option === "gameplay" && "Gameplay / systems"}
                      {option === "ui" && "Interface / visuals"}
                      {option === "audio" && "Audio"}
                      {option === "performance" && "Performance / loading"}
                      {option === "data" && "Saves / data integrity"}
                      {option === "other" && "Other"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.area && <p className="text-xs text-red-400">{errors.area}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-200">
                How often does it happen? <span className="text-[#A75A5B]">*</span>
              </Label>
              <Select value={formValues.frequency} onValueChange={handleChange("frequency")} disabled={isSubmitting}>
                <SelectTrigger className="bg-[#2C222A] border-[#4e324c] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2C222A] border-[#4e324c]">
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-white">
                      {option === "once" && "Just once"}
                      {option === "intermittent" && "Sometimes"}
                      {option === "always" && "Every time"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.frequency && <p className="text-xs text-red-400">{errors.frequency}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-details" className="text-sm text-gray-200">
              What happened? <span className="text-[#A75A5B]">*</span>
            </Label>
            <Textarea
              id="bug-details"
              value={formValues.whatHappened}
              onChange={(event) => handleChange("whatHappened")(event.target.value)}
              placeholder="Tell us exactly what you observed, including any error text."
              rows={4}
              className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40 resize-none"
              disabled={isSubmitting}
            />
            {errors.whatHappened && <p className="text-xs text-red-400">{errors.whatHappened}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-steps" className="text-sm text-gray-200">
              Steps to reproduce
            </Label>
            <Textarea
              id="bug-steps"
              value={formValues.stepsToReproduce}
              onChange={(event) => handleChange("stepsToReproduce")(event.target.value)}
              placeholder="1) Go to...
2) Click...
3) Observe..."
              rows={3}
              className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40 resize-none"
              disabled={isSubmitting}
            />
            {errors.stepsToReproduce && <p className="text-xs text-red-400">{errors.stepsToReproduce}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bug-expected" className="text-sm text-gray-200">
                What did you expect to happen?
              </Label>
              <Textarea
                id="bug-expected"
                value={formValues.expectedResult}
                onChange={(event) => handleChange("expectedResult")(event.target.value)}
                rows={3}
                className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40 resize-none"
                disabled={isSubmitting}
              />
              {errors.expectedResult && <p className="text-xs text-red-400">{errors.expectedResult}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-context" className="text-sm text-gray-200">
                Additional context (logs, nearby actions)
              </Label>
              <Textarea
                id="bug-context"
                value={formValues.additionalContext}
                onChange={(event) => handleChange("additionalContext")(event.target.value)}
                rows={3}
                className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40 resize-none"
                disabled={isSubmitting}
              />
              {errors.additionalContext && <p className="text-xs text-red-400">{errors.additionalContext}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-email" className="text-sm text-gray-200">
              Contact email (optional)
            </Label>
            <Input
              id="bug-email"
              type="email"
              value={formValues.contactEmail}
              onChange={(event) => handleChange("contactEmail")(event.target.value)}
              placeholder="We'll reach out if we need clarification."
              className="bg-[#2C222A] border-[#4e324c] text-white placeholder:text-white/40"
              disabled={isSubmitting}
            />
            {errors.contactEmail && <p className="text-xs text-red-400">{errors.contactEmail}</p>}
          </div>

          <div className="rounded-md border border-yellow-400/40 bg-yellow-400/10 p-3 text-xs text-yellow-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                We automatically attach your session metadata (browser, screen size, current week) to help us reproduce the issue. No personal data beyond your email is shared.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="bg-[#2C222A] border-[#4e324c] text-white hover:bg-[#3c252d]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formValues.summary.trim() || !formValues.whatHappened.trim()}
              className="bg-[#A75A5B] hover:bg-[#D99696] text-white"
            >
              {isSubmitting ? "Sending..." : "Submit bug"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
