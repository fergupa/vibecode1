-- CreateEnum
CREATE TYPE "PreferredLocation" AS ENUM ('Corporate', 'BusinessUnit', 'SharedServices');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('Draft', 'Active', 'Closed');

-- CreateEnum
CREATE TYPE "CampaignMode" AS ENUM ('Individual', 'RoleBased');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('Pending', 'InProgress', 'Completed');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sharedServicesSalary" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT,
    "preferredLocation" "PreferredLocation",
    "locationInherited" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaxonomyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "businessUnit" TEXT,
    "fullyLoadedSalary" DECIMAL(12,2) NOT NULL,
    "fte" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "jobFamily" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyCampaign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'Draft',
    "mode" "CampaignMode" NOT NULL,
    "taxonomyLevel" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAssignment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "employeeId" TEXT,
    "roleName" TEXT,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "token" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'Pending',

    CONSTRAINT "SurveyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "taxonomyNodeId" TEXT NOT NULL,
    "percentTime" DECIMAL(5,2) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "TaxonomyNode_projectId_parentId_idx" ON "TaxonomyNode"("projectId", "parentId");

-- CreateIndex
CREATE INDEX "TaxonomyNode_projectId_level_idx" ON "TaxonomyNode"("projectId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyNode_projectId_code_key" ON "TaxonomyNode"("projectId", "code");

-- CreateIndex
CREATE INDEX "Employee_projectId_idx" ON "Employee"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_projectId_employeeId_key" ON "Employee"("projectId", "employeeId");

-- CreateIndex
CREATE INDEX "SurveyCampaign_projectId_idx" ON "SurveyCampaign"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAssignment_token_key" ON "SurveyAssignment"("token");

-- CreateIndex
CREATE INDEX "SurveyAssignment_campaignId_idx" ON "SurveyAssignment"("campaignId");

-- CreateIndex
CREATE INDEX "SurveyAssignment_token_idx" ON "SurveyAssignment"("token");

-- CreateIndex
CREATE INDEX "SurveyResponse_assignmentId_idx" ON "SurveyResponse"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_assignmentId_taxonomyNodeId_key" ON "SurveyResponse"("assignmentId", "taxonomyNodeId");

-- AddForeignKey
ALTER TABLE "TaxonomyNode" ADD CONSTRAINT "TaxonomyNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyNode" ADD CONSTRAINT "TaxonomyNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TaxonomyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyCampaign" ADD CONSTRAINT "SurveyCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_taxonomyNodeId_fkey" FOREIGN KEY ("taxonomyNodeId") REFERENCES "TaxonomyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
