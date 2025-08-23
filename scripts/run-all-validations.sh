#!/bin/bash
# Comprehensive Release Bug Fix Validation Runner
# Runs all validation scripts and provides deployment readiness assessment

set -e  # Exit on any error

echo "🎯 RELEASE BUG FIX - COMPREHENSIVE VALIDATION"
echo "============================================="
echo "Timestamp: $(date)"
echo "Environment: ${NODE_ENV:-development}"
echo "API Base: ${API_BASE:-http://localhost:5001}"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results tracking
VALIDATION_RESULTS=()
FAILED_TESTS=()

# Function to run validation and track results
run_validation() {
    local test_name=$1
    local script_path=$2
    local description=$3
    
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    echo "   Description: $description"
    echo "   Script: $script_path"
    echo ""
    
    if node "$script_path"; then
        echo -e "${GREEN}✅ $test_name - PASSED${NC}"
        VALIDATION_RESULTS+=("✅ $test_name")
    else
        echo -e "${RED}❌ $test_name - FAILED${NC}"
        VALIDATION_RESULTS+=("❌ $test_name")
        FAILED_TESTS+=("$test_name")
    fi
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check prerequisites
echo "🔍 Checking Prerequisites"
echo "========================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Check if API server is running
if ! curl -s "${API_BASE:-http://localhost:5001}/api/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  API server not responding at ${API_BASE:-http://localhost:5001}${NC}"
    echo "   Please ensure your development server is running"
    echo "   Example: npm run dev"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ API server responding"
fi

# Check script permissions
chmod +x scripts/validate-pr1-query-fix.js 2>/dev/null || true
chmod +x scripts/validate-pr2-auto-fix.js 2>/dev/null || true
chmod +x scripts/comprehensive-release-test.js 2>/dev/null || true

echo "✅ Script permissions updated"
echo ""
echo "=========================================="
echo ""

# Run individual validation scripts
run_validation \
    "PR #1 - Query Fix" \
    "scripts/validate-pr1-query-fix.js" \
    "Tests inclusive query logic for overdue releases"

run_validation \
    "PR #2 - Auto Fix" \
    "scripts/validate-pr2-auto-fix.js" \
    "Tests auto-fix migration for stuck releases"

run_validation \
    "Comprehensive Integration" \
    "scripts/comprehensive-release-test.js" \
    "Tests combined functionality and user experience"

# Deployment readiness assessment
echo -e "${BLUE}📋 DEPLOYMENT READINESS ASSESSMENT${NC}"
echo "=================================="
echo ""

# Print all results
for result in "${VALIDATION_RESULTS[@]}"; do
    echo "   $result"
done
echo ""

# Calculate pass rate
total_tests=${#VALIDATION_RESULTS[@]}
passed_tests=$((total_tests - ${#FAILED_TESTS[@]}))
pass_rate=$((passed_tests * 100 / total_tests))

echo "📊 VALIDATION SUMMARY"
echo "===================="
echo "   Total Tests: $total_tests"
echo "   Passed: $passed_tests"
echo "   Failed: ${#FAILED_TESTS[@]}"
echo "   Pass Rate: $pass_rate%"
echo ""

# Deployment decision
if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED - READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "✅ Deployment Status: APPROVED"
    echo "✅ Bug Fix: Confirmed working"
    echo "✅ User Experience: Improved" 
    echo "✅ Performance: No degradation"
    echo "✅ Data Consistency: Maintained"
    echo ""
    echo "Next Steps:"
    echo "1. Review deployment checklist: scripts/deployment-checklist.md"
    echo "2. Apply PR #1 changes (Critical Fix)"
    echo "3. Apply PR #2 changes (User Experience)"  
    echo "4. Monitor production deployment"
    
    exit 0
else
    echo -e "${RED}💥 VALIDATION FAILURES DETECTED - DEPLOYMENT NOT RECOMMENDED${NC}"
    echo ""
    echo "❌ Deployment Status: BLOCKED"
    echo "❌ Failed Tests: ${#FAILED_TESTS[@]}"
    echo ""
    echo "Failed Validations:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        echo "   - $failed_test"
    done
    echo ""
    echo "Next Steps:"
    echo "1. Review failed test output above"
    echo "2. Fix identified issues"
    echo "3. Re-run validation script"
    echo "4. Do not deploy until all tests pass"
    
    exit 1
fi