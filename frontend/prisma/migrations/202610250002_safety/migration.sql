CREATE TABLE "RequestLimit" (
  "key" TEXT PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL
);
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_valid_dates" CHECK ("endDate" >= "startDate");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_nonnegative_budget" CHECK ("budgetMinor" IS NULL OR "budgetMinor" >= 0);
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_nonnegative_cost" CHECK ("estimatedCostMinor" IS NULL OR "estimatedCostMinor" >= 0);
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_valid_times" CHECK ("endTime" IS NULL OR "endTime" > "startTime");
CREATE INDEX "ScheduleItem_tripId_startTime_idx" ON "ScheduleItem"("tripId", "startTime");
