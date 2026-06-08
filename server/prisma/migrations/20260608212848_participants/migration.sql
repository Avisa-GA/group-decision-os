-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "DecisionParticipant" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecisionParticipant_decisionId_userId_key" ON "DecisionParticipant"("decisionId", "userId");

-- AddForeignKey
ALTER TABLE "DecisionParticipant" ADD CONSTRAINT "DecisionParticipant_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionParticipant" ADD CONSTRAINT "DecisionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
