"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/lib/project-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WizardStep = "project" | "taxonomy" | "employees" | "campaign";

const steps: { key: WizardStep; label: string }[] = [
  { key: "project", label: "Project" },
  { key: "taxonomy", label: "Taxonomy" },
  { key: "employees", label: "Employees" },
  { key: "campaign", label: "Campaign" },
];

type CreatedProject = {
  id: string;
  name: string;
  description: string | null;
};

type ProjectSetupWizardProps = {
  onComplete: () => Promise<void>;
};

const APQC_CATEGORIES = [
  { code: "1.0", name: "Develop Vision and Strategy" },
  { code: "2.0", name: "Develop and Manage Products and Services" },
  { code: "3.0", name: "Market and Sell Products and Services" },
  { code: "4.0", name: "Deliver Products and Services" },
  { code: "5.0", name: "Manage Customer Service" },
  { code: "6.0", name: "Develop and Manage Human Capital" },
  { code: "7.0", name: "Manage Information Technology" },
  { code: "8.0", name: "Manage Financial Resources" },
  { code: "9.0", name: "Acquire, Construct, and Manage Assets" },
  { code: "10.0", name: "Manage Enterprise Risk, Compliance" },
  { code: "11.0", name: "Manage External Relationships" },
  { code: "12.0", name: "Develop and Manage Business Capabilities" },
  { code: "13.0", name: "Manage Health, Safety, Environment" },
];

export function ProjectSetupWizard({ onComplete }: ProjectSetupWizardProps) {
  const router = useRouter();
  const { refreshProjects, selectProject } = useProject();

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("project");

  // Step 1: Project
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(null);

  // Step 1b: SSC Locations
  const [sscLocations, setSSCLocations] = useState<
    { name: string; salary: string; isDefault: boolean }[]
  >([{ name: "Default SSC", salary: "75000", isDefault: true }]);

  // Step 1c: Routing Rules
  const [routingRules, setRoutingRules] = useState<
    { regionMatch: string; categoryMatch: string; sscLocationIndex: number }[]
  >([]);

  // Step 2: Taxonomy
  const [seeding, setSeeding] = useState(false);
  const [uploadingTaxonomy, setUploadingTaxonomy] = useState(false);
  const [taxonomyMessage, setTaxonomyMessage] = useState<string | null>(null);

  // Step 3: Employees
  const [uploadingEmployees, setUploadingEmployees] = useState(false);
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [employeePreview, setEmployeePreview] = useState<{ rowCount: number } | null>(null);
  const [confirmingEmployees, setConfirmingEmployees] = useState(false);
  const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);

  // Step 4: Campaign
  const [campaignName, setCampaignName] = useState("");
  const [campaignMode, setCampaignMode] = useState("Individual");
  const [taxonomyLevel, setTaxonomyLevel] = useState("");
  const [availableLevels, setAvailableLevels] = useState<{ level: number; count: number }[]>([]);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Shared
  const [error, setError] = useState<string | null>(null);

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  // Fetch taxonomy levels when entering campaign step
  useEffect(() => {
    if (currentStep !== "campaign" || !createdProject) return;
    fetch(`/api/projects/${createdProject.id}/taxonomy`)
      .then((res) => res.json())
      .then((nodes: { level: number }[]) => {
        const levelCounts = new Map<number, number>();
        for (const n of nodes) {
          levelCounts.set(n.level, (levelCounts.get(n.level) || 0) + 1);
        }
        const levels = [...levelCounts.entries()]
          .sort(([a], [b]) => a - b)
          .map(([level, count]) => ({ level, count }));
        setAvailableLevels(levels);
        if (levels.length > 0) {
          setTaxonomyLevel(String(levels[levels.length - 1].level));
        }
      })
      .catch(() => setAvailableLevels([]));
  }, [currentStep, createdProject]);

  function resetState() {
    setCurrentStep("project");
    setProjectName("");
    setProjectDescription("");
    setCreatingProject(false);
    setCreatedProject(null);
    setSSCLocations([{ name: "Default SSC", salary: "75000", isDefault: true }]);
    setRoutingRules([]);
    setSeeding(false);
    setUploadingTaxonomy(false);
    setTaxonomyMessage(null);
    setUploadingEmployees(false);
    setEmployeeFile(null);
    setEmployeePreview(null);
    setConfirmingEmployees(false);
    setEmployeeMessage(null);
    setCampaignName("");
    setCampaignMode("Individual");
    setTaxonomyLevel("");
    setAvailableLevels([]);
    setCreatingCampaign(false);
    setError(null);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  }

  async function finishWizard() {
    await refreshProjects();
    // Re-fetch projects to get the full project object with _count
    const res = await fetch("/api/projects");
    if (res.ok) {
      const allProjects: { id: string; name: string; description: string | null; sharedServicesSalary: number | null; createdAt: string; closedAt: string | null; _count: { taxonomyNodes: number; employees: number; surveyCampaigns: number }; campaignStats: { total: number; draft: number; active: number; closed: number; totalAssignments: number; completedAssignments: number }; sharedServiceLocations?: { id: string; name: string; salary: number; isDefault: boolean }[] }[] = await res.json();
      const fullProject = allProjects.find((p) => p.id === createdProject?.id);
      if (fullProject) {
        selectProject(fullProject);
      }
    }
    await onComplete();
    setOpen(false);
    router.push("/admin/analysis");
  }

  // --- Step 1: Create Project ---
  async function handleCreateProject() {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }
    setCreatingProject(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          sscLocations: sscLocations
            .filter((loc) => loc.name.trim() && Number(loc.salary) > 0)
            .map((loc) => ({
              name: loc.name.trim(),
              salary: Number(loc.salary),
              isDefault: loc.isDefault,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project");
      } else {
        // Create routing rules
        if (routingRules.length > 0) {
          const sscRes = await fetch(`/api/projects/${data.id}/ssc-locations`);
          if (sscRes.ok) {
            const createdSSCLocations: { id: string; name: string }[] = await sscRes.json();
            for (const rule of routingRules) {
              if (!rule.regionMatch && !rule.categoryMatch) continue;
              const sscLoc = createdSSCLocations[rule.sscLocationIndex];
              if (!sscLoc) continue;
              await fetch(`/api/projects/${data.id}/routing-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  regionMatch: rule.regionMatch || null,
                  categoryMatch: rule.categoryMatch || null,
                  sscLocationId: sscLoc.id,
                }),
              });
            }
          }
        }

        setCreatedProject(data);
        setCurrentStep("taxonomy");
      }
    } catch {
      setError("Network error");
    }
    setCreatingProject(false);
  }

  // --- Step 2: Taxonomy ---
  async function handleSeedApqc() {
    if (!createdProject) return;
    setSeeding(true);
    setError(null);
    setTaxonomyMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${createdProject.id}/taxonomy/seed-apqc`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to seed");
      } else {
        setTaxonomyMessage(data.message || "APQC taxonomy seeded successfully");
        setTimeout(() => setCurrentStep("employees"), 1000);
      }
    } catch {
      setError("Network error");
    }
    setSeeding(false);
  }

  async function handleTaxonomyFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !createdProject) return;

    setUploadingTaxonomy(true);
    setError(null);
    setTaxonomyMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Preview
      const previewRes = await fetch(
        `/api/projects/${createdProject.id}/taxonomy/import`,
        { method: "POST", body: formData }
      );
      const previewData = await previewRes.json();

      if (!previewRes.ok) {
        setError(
          previewData.error +
            (previewData.details
              ? "\n" + previewData.details.map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`).join("\n")
              : "")
        );
        setUploadingTaxonomy(false);
        return;
      }

      // Confirm
      const confirmFormData = new FormData();
      confirmFormData.append("file", file);
      const confirmRes = await fetch(
        `/api/projects/${createdProject.id}/taxonomy/import?confirm=true`,
        { method: "POST", body: confirmFormData }
      );
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setError(confirmData.error || "Import failed");
      } else {
        setTaxonomyMessage(confirmData.message || "Taxonomy imported successfully");
        setTimeout(() => setCurrentStep("employees"), 1000);
      }
    } catch {
      setError("Network error");
    }
    setUploadingTaxonomy(false);
  }

  // --- Step 3: Employees ---
  async function handleEmployeeFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !createdProject) return;

    setEmployeeFile(selectedFile);
    setUploadingEmployees(true);
    setError(null);
    setEmployeeMessage(null);
    setEmployeePreview(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(
        `/api/projects/${createdProject.id}/employees/import`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error +
            (data.details
              ? "\n" +
                data.details
                  .slice(0, 10)
                  .map((d: { row: number; message: string }) => `Row ${d.row}: ${d.message}`)
                  .join("\n")
              : "")
        );
      } else if (data.preview) {
        setEmployeePreview({ rowCount: data.rowCount });
      }
    } catch {
      setError("Network error");
    }
    setUploadingEmployees(false);
  }

  async function handleConfirmEmployees() {
    if (!employeeFile || !createdProject) return;
    setConfirmingEmployees(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", employeeFile);

    try {
      const res = await fetch(
        `/api/projects/${createdProject.id}/employees/import?confirm=true`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setEmployeeMessage(data.message || "Employees imported successfully");
        setTimeout(() => setCurrentStep("campaign"), 1000);
      }
    } catch {
      setError("Network error");
    }
    setConfirmingEmployees(false);
  }

  // --- Step 4: Campaign ---
  async function handleCreateCampaign() {
    if (!campaignName.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (!createdProject) return;
    setCreatingCampaign(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${createdProject.id}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          mode: campaignMode,
          taxonomyLevel: Number(taxonomyLevel),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create campaign");
      } else {
        await finishWizard();
      }
    } catch {
      setError("Network error");
    }
    setCreatingCampaign(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Up New Project</DialogTitle>
          <DialogDescription>
            Follow the steps to create and configure your project.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div
                className={`h-2 rounded ${
                  i <= currentIndex ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
              <span className="mt-1 block text-xs text-center text-gray-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 1: Create Project */}
          {currentStep === "project" && (
            <>
              <div>
                <Label htmlFor="wizard-project-name">Project Name</Label>
                <Input
                  id="wizard-project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Finance Transformation 2026"
                  required
                />
              </div>
              <div>
                <Label htmlFor="wizard-project-desc">Description (optional)</Label>
                <Input
                  id="wizard-project-desc"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief description of the project"
                />
              </div>

              <div className="space-y-2">
                <Label>Shared Service Locations</Label>
                <p className="text-xs text-gray-500">
                  Define SSC locations and their average fully-loaded salary. The
                  default location is used unless overridden per activity.
                </p>
                {sscLocations.map((loc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={loc.name}
                      onChange={(e) => {
                        const updated = [...sscLocations];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setSSCLocations(updated);
                      }}
                      placeholder="Location name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={loc.salary}
                      onChange={(e) => {
                        const updated = [...sscLocations];
                        updated[i] = { ...updated[i], salary: e.target.value };
                        setSSCLocations(updated);
                      }}
                      placeholder="Salary"
                      className="w-28"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                      <input
                        type="radio"
                        name="ssc-default"
                        checked={loc.isDefault}
                        onChange={() => {
                          setSSCLocations(
                            sscLocations.map((l, j) => ({
                              ...l,
                              isDefault: j === i,
                            }))
                          );
                        }}
                      />
                      Default
                    </label>
                    {sscLocations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500"
                        onClick={() => {
                          const updated = sscLocations.filter((_, j) => j !== i);
                          // If we removed the default, make the first one default
                          if (loc.isDefault && updated.length > 0) {
                            updated[0] = { ...updated[0], isDefault: true };
                          }
                          setSSCLocations(updated);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSSCLocations([
                      ...sscLocations,
                      { name: "", salary: "75000", isDefault: false },
                    ])
                  }
                >
                  Add Location
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Routing Rules (Optional)</Label>
                <p className="text-xs text-gray-500">
                  Route employees to different SSC locations based on their region
                  and/or activity category. Most specific rule wins.
                </p>
                {routingRules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={rule.regionMatch || "__any__"}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], regionMatch: v === "__any__" ? "" : v };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any Region</SelectItem>
                        <SelectItem value="Americas">Americas</SelectItem>
                        <SelectItem value="Europe">Europe</SelectItem>
                        <SelectItem value="Asia">Asia</SelectItem>
                        <SelectItem value="Africa">Africa</SelectItem>
                        <SelectItem value="Oceania">Oceania</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.categoryMatch || "__any__"}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], categoryMatch: v === "__any__" ? "" : v };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any Category</SelectItem>
                        {APQC_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.code} value={cat.code}>
                            {cat.code} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(rule.sscLocationIndex)}
                      onValueChange={(v) => {
                        const updated = [...routingRules];
                        updated[i] = { ...updated[i], sscLocationIndex: Number(v) };
                        setRoutingRules(updated);
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="SSC Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {sscLocations.map((loc, j) => (
                          <SelectItem key={j} value={String(j)}>
                            {loc.name || `Location ${j + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-500"
                      onClick={() => setRoutingRules(routingRules.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoutingRules([
                      ...routingRules,
                      { regionMatch: "", categoryMatch: "", sscLocationIndex: 0 },
                    ])
                  }
                >
                  Add Rule
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Taxonomy */}
          {currentStep === "taxonomy" && (
            <>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">APQC Template</h4>
                <p className="mb-3 text-sm text-gray-500">
                  Seed a standard APQC Process Classification Framework with 13
                  categories and representative processes.
                </p>
                <Button onClick={handleSeedApqc} disabled={seeding || !!taxonomyMessage}>
                  {seeding ? "Seeding..." : "Seed APQC Template"}
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Upload CSV</h4>
                <p className="mb-3 text-sm text-gray-500">
                  CSV columns: Code, Name, Level, ParentCode, Description
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleTaxonomyFileUpload}
                  disabled={uploadingTaxonomy || !!taxonomyMessage}
                  className="text-sm"
                />
                {uploadingTaxonomy && (
                  <p className="mt-2 text-sm text-gray-500">Importing...</p>
                )}
              </div>

              {taxonomyMessage && (
                <p className="text-sm text-green-600">{taxonomyMessage}</p>
              )}
            </>
          )}

          {/* Step 3: Employees */}
          {currentStep === "employees" && (
            <>
              <p className="text-sm text-gray-500">
                Upload a CSV with columns: EmployeeID, Name, Email, Title,
                Department, Location, Region, BusinessUnit, FullyLoadedSalary, FTE,
                JobFamily
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleEmployeeFileSelect}
                disabled={uploadingEmployees || !!employeeMessage}
                className="text-sm"
              />

              {uploadingEmployees && (
                <p className="text-sm text-gray-500">Processing...</p>
              )}

              {employeePreview && !employeeMessage && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Preview: {employeePreview.rowCount} rows found
                  </p>
                  <Button
                    onClick={handleConfirmEmployees}
                    disabled={confirmingEmployees}
                  >
                    {confirmingEmployees
                      ? "Importing..."
                      : `Import ${employeePreview.rowCount} Employees`}
                  </Button>
                </div>
              )}

              {employeeMessage && (
                <p className="text-sm text-green-600">{employeeMessage}</p>
              )}
            </>
          )}

          {/* Step 4: Campaign */}
          {currentStep === "campaign" && (
            <>
              <div>
                <Label htmlFor="wizard-campaign-name">Campaign Name</Label>
                <Input
                  id="wizard-campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q1 2026 Activity Assessment"
                />
              </div>

              <div>
                <Label>Mode</Label>
                <Select value={campaignMode} onValueChange={setCampaignMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">
                      Individual — one survey per employee
                    </SelectItem>
                    <SelectItem value="RoleBased">
                      Role-Based — one survey per job family
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Taxonomy Level</Label>
                {availableLevels.length === 0 ? (
                  <p className="text-sm text-amber-600">
                    No taxonomy nodes found. Import a taxonomy first or skip this
                    step.
                  </p>
                ) : (
                  <Select value={taxonomyLevel} onValueChange={setTaxonomyLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLevels.map(({ level, count }) => (
                        <SelectItem key={level} value={String(level)}>
                          Level {level} ({count} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <p className="whitespace-pre-wrap text-sm text-red-600">{error}</p>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {currentStep !== "project" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    const prevIndex = currentIndex - 1;
                    if (prevIndex >= 0) {
                      setCurrentStep(steps[prevIndex].key);
                    }
                  }}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Skip buttons for optional steps */}
              {currentStep === "taxonomy" && !taxonomyMessage && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setCurrentStep("employees");
                  }}
                >
                  Skip
                </Button>
              )}

              {currentStep === "employees" && !employeeMessage && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setCurrentStep("campaign");
                  }}
                >
                  Skip
                </Button>
              )}

              {currentStep === "campaign" && (
                <Button variant="ghost" onClick={finishWizard}>
                  Skip
                </Button>
              )}

              {/* Action buttons */}
              {currentStep === "project" && (
                <Button onClick={handleCreateProject} disabled={creatingProject}>
                  {creatingProject ? "Creating..." : "Create & Continue"}
                </Button>
              )}

              {currentStep === "campaign" && (
                <Button
                  onClick={handleCreateCampaign}
                  disabled={creatingCampaign || availableLevels.length === 0}
                >
                  {creatingCampaign ? "Creating..." : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
