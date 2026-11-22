ALTER TABLE injury_reports ADD COLUMN resolved_at TEXT;
--> statement-breakpoint
CREATE TRIGGER revision_injury_report_insert AFTER INSERT ON injury_reports
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_injury_report_resolved AFTER UPDATE OF resolved_at ON injury_reports
WHEN OLD.resolved_at IS NOT NEW.resolved_at
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
