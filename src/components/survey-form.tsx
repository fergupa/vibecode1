"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ActivityInput } from "./activity-input";
import { SurveyProgressBar } from "./survey-progress-bar";
import { Button } from "@/components/ui/button";

type Activity = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
};

type Parent = {
  id: string;
  code: string;
  name: string;
};

type ExistingResponse = {
  taxonomyNodeId: string;
  percentTime: number;
  submitted: boolean;
};

type SurveyFormProps = {
  token: string;
  activities: Activity[];
  parents: Parent[];
  existingResponses: ExistingResponse[];
  respondentName: string;
  campaignName: string;
  onSubmitted: () => void;
};

export function SurveyForm({
  token,
  activities,
  parents,
  existingResponses,
  respondentName,
  campaignName,
  onSubmitted,
}: SurveyFormProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const r of existingResponses) {
      initial[r.taxonomyNodeId] = r.percentTime;
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(parents.map((p) => p.id))
  );
  const lastSaveRef = useRef<string>("");

  const total = Object.values(values).reduce((sum, v) => sum + v, 0);

  // Group activities by parent
  const parentMap = new Map(parents.map((p) => [p.id, p]));
  const grouped = new Map<string, Activity[]>();
  const ungrouped: Activity[] = [];

  for (const a of activities) {
    if (a.parentId && parentMap.has(a.parentId)) {
      if (!grouped.has(a.parentId)) grouped.set(a.parentId, []);
      grouped.get(a.parentId)!.push(a);
    } else {
      ungrouped.push(a);
    }
  }

  // Auto-save draft every 30 seconds
  const saveDraft = useCallback(async () => {
    const responses = Object.entries(values)
      .filter(([, v]) => v > 0)
      .map(([taxonomyNodeId, percentTime]) => ({ taxonomyNodeId, percentTime }));

    const key = JSON.stringify(responses);
    if (key === lastSaveRef.current) return;
    lastSaveRef.current = key;

    if (responses.length === 0) return;

    await fetch(`/api/survey/${token}/responses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses }),
    });
  }, [values, token]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  function updateValue(activityId: string, value: number) {
    setValues((prev) => ({ ...prev, [activityId]: value }));
  }

  function toggleGroup(parentId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  async function handleSubmit() {
    if (Math.abs(total - 100) > 0.1) {
      setError(`Total must equal 100%. Currently at ${total.toFixed(1)}%.`);
      return;
    }

    if (!confirm("Submit your survey? This cannot be undone.")) return;

    setSubmitting(true);
    setError(null);

    // Include all activities (zeros too)
    const responses = activities.map((a) => ({
      taxonomyNodeId: a.id,
      percentTime: values[a.id] || 0,
    }));

    const res = await fetch(`/api/survey/${token}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Submission failed");
      setSubmitting(false);
    } else {
      onSubmitted();
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{campaignName}</h1>
        <p className="mt-1 text-gray-500">
          Hi {respondentName}! Please allocate your time across the activities below.
          The total must equal 100%.
        </p>
      </div>

      <SurveyProgressBar total={total} />

      <div className="mt-4 space-y-6">
        {/* Grouped activities */}
        {parents.map((parent) => {
          const groupActivities = grouped.get(parent.id) || [];
          if (groupActivities.length === 0) return null;
          const isExpanded = expandedGroups.has(parent.id);
          const groupTotal = groupActivities.reduce(
            (sum, a) => sum + (values[a.id] || 0),
            0
          );

          return (
            <div key={parent.id} className="rounded-lg border">
              <button
                onClick={() => toggleGroup(parent.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <span className="font-mono text-xs text-gray-400">
                    {parent.code}
                  </span>{" "}
                  <span className="font-medium">{parent.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{groupTotal.toFixed(1)}%</span>
                  <span>{isExpanded ? "▾" : "▸"}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="space-y-1 px-4 pb-3">
                  {groupActivities.map((a) => (
                    <ActivityInput
                      key={a.id}
                      code={a.code}
                      name={a.name}
                      value={values[a.id] || 0}
                      onChange={(v) => updateValue(a.id, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped activities */}
        {ungrouped.length > 0 && (
          <div className="space-y-1">
            {ungrouped.map((a) => (
              <ActivityInput
                key={a.id}
                code={a.code}
                name={a.name}
                value={values[a.id] || 0}
                onChange={(v) => updateValue(a.id, v)}
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={submitting || Math.abs(total - 100) > 0.1}
          className="flex-1"
        >
          {submitting ? "Submitting..." : "Submit Survey"}
        </Button>
        <Button variant="outline" onClick={saveDraft}>
          Save Draft
        </Button>
      </div>
    </div>
  );
}
