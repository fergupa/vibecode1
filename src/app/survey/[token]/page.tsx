"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SurveyForm } from "@/components/survey-form";

type SurveyData = {
  assignment: {
    id: string;
    status: "Pending" | "InProgress" | "Completed";
    respondentName: string;
    headcount: number;
  };
  campaign: {
    name: string;
    mode: string;
  };
  activities: {
    id: string;
    code: string;
    name: string;
    parentId: string | null;
  }[];
  parents: {
    id: string;
    code: string;
    name: string;
  }[];
  existingResponses: {
    taxonomyNodeId: string;
    percentTime: number;
    submitted: boolean;
  }[];
};

function CompletedSummary({
  data,
}: {
  data: SurveyData;
}) {
  const responses = data.existingResponses.filter((r) => r.percentTime > 0);
  responses.sort((a, b) => b.percentTime - a.percentTime);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-700">
          Thank you, {data.assignment.respondentName}!
        </h1>
        <p className="mt-2 text-gray-500">
          Your survey for &quot;{data.campaign.name}&quot; has been submitted.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Your Time Allocation</h2>
        <div className="space-y-2">
          {responses.map((r) => {
            const activity = data.activities.find(
              (a) => a.id === r.taxonomyNodeId
            );
            return (
              <div key={r.taxonomyNodeId} className="flex items-center gap-3">
                <div
                  className="h-4 rounded bg-blue-500"
                  style={{ width: `${r.percentTime * 2}px` }}
                />
                <span className="w-12 text-right text-sm font-medium">
                  {r.percentTime}%
                </span>
                <span className="text-sm">
                  {activity?.name || r.taxonomyNodeId}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SurveyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/survey/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load survey");
      } else {
        const surveyData = await res.json();
        setData(surveyData);
        if (surveyData.assignment.status === "Completed") {
          setSubmitted(true);
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading survey...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Survey Error</h1>
          <p className="mt-2 text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (submitted) {
    return <CompletedSummary data={data} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <SurveyForm
        token={token}
        activities={data.activities}
        parents={data.parents}
        existingResponses={data.existingResponses}
        respondentName={data.assignment.respondentName}
        campaignName={data.campaign.name}
        onSubmitted={() => setSubmitted(true)}
      />
    </div>
  );
}
