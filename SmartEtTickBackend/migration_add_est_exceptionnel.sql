ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS est_exceptionnel BOOLEAN DEFAULT FALSE;

UPDATE tickets
SET est_exceptionnel = FALSE
WHERE est_exceptionnel IS NULL;

ALTER TABLE tickets
ALTER COLUMN est_exceptionnel SET NOT NULL;
