import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestDataPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-data');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const runValidationTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/validate-types');
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      setValidationResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ title, data, expectedCounts }: { title: string; data: any; expectedCounts?: any }) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {data?.status && (
            <Badge variant={data.error ? "destructive" : "default"}>
              {data.error ? "Error" : "Success"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.error ? (
          <div className="text-red-600 p-4 bg-red-500/10 rounded">
            Error: {data.error}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm bg-gray-500/10 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
        
        {expectedCounts && data?.counts && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded">
            <h4 className="font-medium mb-2">Verification Checklist:</h4>
            <ul className="space-y-1 text-sm">
              <li className={data.counts.roles === expectedCounts.roles ? "text-green-600" : "text-red-600"}>
                {data.counts.roles === expectedCounts.roles ? "✓" : "✗"} 
                Roles: {data.counts.roles} (expected {expectedCounts.roles})
              </li>
              <li className={data.counts.artists === expectedCounts.artists ? "text-green-600" : "text-red-600"}>
                {data.counts.artists === expectedCounts.artists ? "✓" : "✗"} 
                Artists: {data.counts.artists} (expected {expectedCounts.artists})
              </li>
              <li className={data.counts.events === expectedCounts.events ? "text-green-600" : "text-red-600"}>
                {data.counts.events === expectedCounts.events ? "✓" : "✗"} 
                Events: {data.counts.events} (expected {expectedCounts.events})
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Data Integration Test</h1>
        <p className="text-white/70">Verify that JSON game data files are loading correctly</p>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={runTestData} disabled={loading}>
            {loading ? "Testing..." : "Test Data Loading"}
          </Button>
          <Button onClick={runValidationTest} disabled={loading} variant="outline">
            {loading ? "Validating..." : "Test Type Validation"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {testResults && (
          <ResultCard 
            title="Step 1A: Data Loading Test" 
            data={testResults}
            expectedCounts={{ roles: 8, artists: 3, events: 12 }}
          />
        )}
        
        {validationResults && (
          <ResultCard 
            title="Step 1B: Type Validation Test" 
            data={validationResults}
          />
        )}
      </div>
    </div>
  );
}