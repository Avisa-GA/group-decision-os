-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('DRAFT', 'VOTING', 'LOCKED');

-- CreateEnum
CREATE TYPE "VoteMode" AS ENUM ('SIMPLE', 'RANKED', 'WEIGHTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "voteMode" "VoteMode" NOT NULL DEFAULT 'SIMPLE',
    "inviteToken" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "decisionId" TEXT NOT NULL,
    "winningOptionId" TEXT NOT NULL,
    "tie" BOOLEAN NOT NULL DEFAULT false,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("decisionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_inviteToken_key" ON "Decision"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_decisionId_userId_key" ON "Vote"("decisionId", "userId");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
