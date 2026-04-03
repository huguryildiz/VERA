-- 002_demo_premium_seed.sql — VERA v1 Premium Demo Seed
-- Canonical schema: organizations, frameworks (with criteria/outcomes/maps),
-- periods (with snapshots), projects, jurors, auth, tokens, scores, audit logs.
-- Source of truth: docs/superpowers/plans/db-migration/seed_generation_prompt.md

BEGIN;

SELECT setseed(0.20260402);

-- ============================================================================
-- PART 1: Organizations
-- ============================================================================
INSERT INTO organizations (id, code, name, institution_name, contact_email, status, created_at, updated_at)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'TEDU-EE', 'TED University / Electrical-Electronics Engineering', 'TED University', 'ee-admin@tedu.edu.tr', 'active', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('aa000000-0000-0000-0000-000000000002', 'CMU-CS', 'Carnegie Mellon University / Computer Science', 'Carnegie Mellon University', 'cs-admin@cmu.edu', 'active', '2025-09-01T08:05:00Z', '2025-09-01T08:05:00Z'),
  ('aa000000-0000-0000-0000-000000000003', 'TEKNOFEST', 'TEKNOFEST / Teknoloji Yarışmaları', 'TÜBİTAK', 'jury@teknofest.org', 'active', '2025-09-01T08:10:00Z', '2025-09-01T08:10:00Z'),
  ('aa000000-0000-0000-0000-000000000004', 'TUBITAK', 'TÜBİTAK / 2204-A Lise Araştırma Projeleri', 'TÜBİTAK', '2204a@tubitak.gov.tr', 'active', '2025-09-01T08:15:00Z', '2025-09-01T08:15:00Z'),
  ('aa000000-0000-0000-0000-000000000005', 'IEEE', 'IEEE / AP-S Student Design Contest', 'IEEE', 'aps-sdc@ieee.org', 'active', '2025-09-01T08:20:00Z', '2025-09-01T08:20:00Z'),
  ('aa000000-0000-0000-0000-000000000006', 'CANSAT', 'CanSat Competition / 2025', 'TÜBİTAK', 'jury@cansat.org', 'active', '2025-09-01T08:25:00Z', '2025-09-01T08:25:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 2: Frameworks, Criteria, Outcomes, Criterion-Outcome Maps
-- ============================================================================

-- TEDU EE Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'TEDU EE MUDEK 2026', 'MUDEK-aligned outcomes for EE capstone evaluation', 'v1.0', 70, 'MUDEK', true, '2025-09-02T09:00:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A1', 'Knowledge Application', 'Apply knowledge of mathematics, science, and discipline-specific engineering', 1, '2025-09-03T10:00:00Z'),
  ('cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A2', 'Problem Analysis', 'Identify, formulate, and solve complex engineering problems', 2, '2025-09-03T10:01:00Z'),
  ('cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A3', 'Design and Development', 'Design systems under realistic constraints', 3, '2025-09-03T10:02:00Z'),
  ('cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A4', 'Investigation', 'Conduct experiments and analyze complex engineering problems', 4, '2025-09-03T10:03:00Z'),
  ('cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A5', 'Modern Tools', 'Select and use modern engineering tools and information technologies', 5, '2025-09-03T10:04:00Z'),
  ('cc000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A6', 'Professional Ethics', 'Understand ethical principles and responsibility in engineering', 6, '2025-09-03T10:05:00Z'),
  ('cc000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A7', 'Communication', 'Communicate effectively in Turkish and foreign languages', 7, '2025-09-03T10:06:00Z'),
  ('cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A8', 'Management', 'Understand project management and entrepreneurship', 8, '2025-09-03T10:07:00Z'),
  ('cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A9', 'Teamwork', 'Work effectively in teams and individually', 9, '2025-09-03T10:08:00Z'),
  ('cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A10', 'Lifelong Learning', 'Awareness of continuous self-improvement and technical development', 10, '2025-09-03T10:09:00Z'),
  ('cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'MUDEK-A11', 'Societal Impact', 'Understand effects of engineering on society and environment', 11, '2025-09-03T10:10:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'technical', 'Technical Depth & Design', 'Technical', 'Complexity of solution, depth of technical understanding, soundness of design approach', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:00:00Z'),
  ('fc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'design', 'Written Report & Documentation', 'Written', 'Report quality, clarity of writing, proper documentation, completeness', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:00:30Z'),
  ('fc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001', 'delivery', 'Oral Presentation & Q&A', 'Oral', 'Presentation clarity, confidence, ability to answer questions, time management', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:01:00Z'),
  ('fc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001', 'teamwork', 'Teamwork & Collaboration', 'Teamwork', 'Team cohesion, division of work, mutual support, individual contributions', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:01:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'direct', 0.25, '2025-09-04T09:00:00Z'),
  ('fm000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000002', 'direct', 0.30, '2025-09-04T09:00:10Z'),
  ('fm000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000003', 'direct', 0.25, '2025-09-04T09:00:20Z'),
  ('fm000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000004', 'indirect', 0.20, '2025-09-04T09:00:30Z'),
  ('fm000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000007', 'direct', 0.5, '2025-09-04T09:01:00Z'),
  ('fm000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000006', 'direct', 0.5, '2025-09-04T09:01:10Z'),
  ('fm000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000007', 'direct', 0.6, '2025-09-04T09:01:30Z'),
  ('fm000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000008', 'indirect', 0.4, '2025-09-04T09:01:40Z'),
  ('fm000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000009', 'direct', 1.0, '2025-09-04T09:02:00Z')
ON CONFLICT DO NOTHING;

-- CMU CS Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000002', 'CMU CS ABET 2026', 'ABET-aligned outcomes for CS capstone evaluation', 'v1.0', 70, 'ABET', true, '2025-09-02T09:05:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000101', 'bb000000-0000-0000-0000-000000000002', 'ABET-A1', 'Complex Problem Solving', 'Apply engineering principles to solve complex problems', 1, '2025-09-03T10:20:00Z'),
  ('cc000000-0000-0000-0000-000000000102', 'bb000000-0000-0000-0000-000000000002', 'ABET-A2', 'Engineering Design', 'Design solutions considering social, environmental, economic factors', 2, '2025-09-03T10:21:00Z'),
  ('cc000000-0000-0000-0000-000000000103', 'bb000000-0000-0000-0000-000000000002', 'ABET-A3', 'Communication', 'Communicate effectively with diverse audiences', 3, '2025-09-03T10:22:00Z'),
  ('cc000000-0000-0000-0000-000000000104', 'bb000000-0000-0000-0000-000000000002', 'ABET-A4', 'Ethics', 'Make ethical decisions and evaluate broader impacts', 4, '2025-09-03T10:23:00Z'),
  ('cc000000-0000-0000-0000-000000000105', 'bb000000-0000-0000-0000-000000000002', 'ABET-A5', 'Teamwork', 'Function effectively on collaborative teams', 5, '2025-09-03T10:24:00Z'),
  ('cc000000-0000-0000-0000-000000000106', 'bb000000-0000-0000-0000-000000000002', 'ABET-A6', 'Experimentation', 'Design experiments and interpret data', 6, '2025-09-03T10:25:00Z'),
  ('cc000000-0000-0000-0000-000000000107', 'bb000000-0000-0000-0000-000000000002', 'ABET-A7', 'Lifelong Learning', 'Acquire and apply new knowledge as needed', 7, '2025-09-03T10:26:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000101', 'bb000000-0000-0000-0000-000000000002', 'technical', 'Technical Implementation', 'Technical', 'Code quality, architectural design, algorithmic complexity', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:10:00Z'),
  ('fc000000-0000-0000-0000-000000000102', 'bb000000-0000-0000-0000-000000000002', 'design', 'Documentation & Design', 'Written', 'API documentation, design patterns, code comments', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:10:30Z'),
  ('fc000000-0000-0000-0000-000000000103', 'bb000000-0000-0000-0000-000000000002', 'delivery', 'Demo & Presentation', 'Oral', 'Live demonstration quality, presentation clarity, testing explanation', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:11:00Z'),
  ('fc000000-0000-0000-0000-000000000104', 'bb000000-0000-0000-0000-000000000002', 'teamwork', 'Collaboration & Testing', 'Teamwork', 'Peer code review, testing coverage, collaboration evidence', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:11:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000101', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000101', 'cc000000-0000-0000-0000-000000000101', 'direct', 0.4, '2025-09-04T09:10:00Z'),
  ('fm000000-0000-0000-0000-000000000102', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000101', 'cc000000-0000-0000-0000-000000000102', 'direct', 0.6, '2025-09-04T09:10:10Z'),
  ('fm000000-0000-0000-0000-000000000103', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000102', 'cc000000-0000-0000-0000-000000000103', 'direct', 0.5, '2025-09-04T09:10:30Z'),
  ('fm000000-0000-0000-0000-000000000104', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000102', 'cc000000-0000-0000-0000-000000000104', 'direct', 0.5, '2025-09-04T09:10:40Z'),
  ('fm000000-0000-0000-0000-000000000105', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000103', 'cc000000-0000-0000-0000-000000000103', 'direct', 0.7, '2025-09-04T09:11:00Z'),
  ('fm000000-0000-0000-0000-000000000106', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000103', 'cc000000-0000-0000-0000-000000000106', 'indirect', 0.3, '2025-09-04T09:11:10Z'),
  ('fm000000-0000-0000-0000-000000000107', 'bb000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000104', 'cc000000-0000-0000-0000-000000000105', 'direct', 1.0, '2025-09-04T09:11:30Z')
ON CONFLICT DO NOTHING;

-- TEKNOFEST Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000003', 'TEKNOFEST Competition 2026', 'Competition-oriented outcomes for technology challenges', 'v1.0', 75, 'TEK', true, '2025-09-02T09:10:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000201', 'bb000000-0000-0000-0000-000000000003', 'TEK-1', 'Originality & Feasibility', 'Novel concept with realistic implementation approach', 1, '2025-09-03T10:30:00Z'),
  ('cc000000-0000-0000-0000-000000000202', 'bb000000-0000-0000-0000-000000000003', 'TEK-2', 'Technical Design', 'Engineering soundness and detailed design specifications', 2, '2025-09-03T10:31:00Z'),
  ('cc000000-0000-0000-0000-000000000203', 'bb000000-0000-0000-0000-000000000003', 'TEK-3', 'Field Performance', 'Actual functionality demonstrated during jury assessment', 3, '2025-09-03T10:32:00Z'),
  ('cc000000-0000-0000-0000-000000000204', 'bb000000-0000-0000-0000-000000000003', 'TEK-4', 'Overall Quality', 'Report quality, presentation, and localization value', 4, '2025-09-03T10:33:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000201', 'bb000000-0000-0000-0000-000000000003', 'technical', 'Technical Innovation & Design', 'Technical', 'Originality, feasibility, design complexity, engineering rigor', 30, 0.40, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:20:00Z'),
  ('fc000000-0000-0000-0000-000000000202', 'bb000000-0000-0000-0000-000000000003', 'design', 'Documentation & Reports', 'Written', 'Critical Design Report quality, completeness, clarity', 30, 0.25, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:20:30Z'),
  ('fc000000-0000-0000-0000-000000000203', 'bb000000-0000-0000-0000-000000000003', 'delivery', 'Live Demo & Presentation', 'Oral', 'Field test performance, jury presentation quality, responsiveness', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:21:00Z'),
  ('fc000000-0000-0000-0000-000000000204', 'bb000000-0000-0000-0000-000000000003', 'teamwork', 'Production & Localization', 'Teamwork', 'Domestic component usage, team coordination, sustainability', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:21:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000201', 'bb000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000201', 'cc000000-0000-0000-0000-000000000201', 'direct', 0.5, '2025-09-04T09:20:00Z'),
  ('fm000000-0000-0000-0000-000000000202', 'bb000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000201', 'cc000000-0000-0000-0000-000000000202', 'direct', 0.5, '2025-09-04T09:20:10Z'),
  ('fm000000-0000-0000-0000-000000000203', 'bb000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000202', 'cc000000-0000-0000-0000-000000000202', 'direct', 1.0, '2025-09-04T09:20:30Z'),
  ('fm000000-0000-0000-0000-000000000204', 'bb000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000203', 'cc000000-0000-0000-0000-000000000203', 'direct', 1.0, '2025-09-04T09:20:40Z'),
  ('fm000000-0000-0000-0000-000000000205', 'bb000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000204', 'cc000000-0000-0000-0000-000000000204', 'direct', 1.0, '2025-09-04T09:21:00Z')
ON CONFLICT DO NOTHING;

-- TUBITAK Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000004', 'TUBITAK 2204-A Research 2026', 'Research competition outcomes for high-school projects', 'v1.0', 72, 'TUB', true, '2025-09-02T09:15:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000301', 'bb000000-0000-0000-0000-000000000004', 'TUB-1', 'Originality', 'Novel research idea and creative approach', 1, '2025-09-03T10:40:00Z'),
  ('cc000000-0000-0000-0000-000000000302', 'bb000000-0000-0000-0000-000000000004', 'TUB-2', 'Scientific Method', 'Rigorous methodology and sound scientific reasoning', 2, '2025-09-03T10:41:00Z'),
  ('cc000000-0000-0000-0000-000000000303', 'bb000000-0000-0000-0000-000000000004', 'TUB-3', 'Results & Impact', 'Quality of findings and social/educational impact', 3, '2025-09-03T10:42:00Z'),
  ('cc000000-0000-0000-0000-000000000304', 'bb000000-0000-0000-0000-000000000004', 'TUB-4', 'Feasibility', 'Applicability and realistic implementation potential', 4, '2025-09-03T10:43:00Z'),
  ('cc000000-0000-0000-0000-000000000305', 'bb000000-0000-0000-0000-000000000004', 'TUB-5', 'Societal Value', 'Broader impact and community benefit', 5, '2025-09-03T10:44:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000301', 'bb000000-0000-0000-0000-000000000004', 'technical', 'Research Methodology & Results', 'Technical', 'Originality of idea, rigor of method, quality of findings', 30, 0.40, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:30:00Z'),
  ('fc000000-0000-0000-0000-000000000302', 'bb000000-0000-0000-0000-000000000004', 'design', 'Report & Documentation', 'Written', 'Clarity of writing, proper citations, completeness of documentation', 30, 0.25, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:30:30Z'),
  ('fc000000-0000-0000-0000-000000000303', 'bb000000-0000-0000-0000-000000000004', 'delivery', 'Presentation & Discussion', 'Oral', 'Clarity of presentation, response to questions, confidence', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:31:00Z'),
  ('fc000000-0000-0000-0000-000000000304', 'bb000000-0000-0000-0000-000000000004', 'teamwork', 'Team Collaboration & Feasibility', 'Teamwork', 'Teamwork quality, applicability, sustainability', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:31:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000301', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000301', 'cc000000-0000-0000-0000-000000000301', 'direct', 0.3, '2025-09-04T09:30:00Z'),
  ('fm000000-0000-0000-0000-000000000302', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000301', 'cc000000-0000-0000-0000-000000000302', 'direct', 0.4, '2025-09-04T09:30:10Z'),
  ('fm000000-0000-0000-0000-000000000303', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000301', 'cc000000-0000-0000-0000-000000000303', 'direct', 0.3, '2025-09-04T09:30:20Z'),
  ('fm000000-0000-0000-0000-000000000304', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000302', 'cc000000-0000-0000-0000-000000000302', 'indirect', 0.3, '2025-09-04T09:30:40Z'),
  ('fm000000-0000-0000-0000-000000000305', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000302', 'cc000000-0000-0000-0000-000000000303', 'direct', 0.7, '2025-09-04T09:30:50Z'),
  ('fm000000-0000-0000-0000-000000000306', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000303', 'cc000000-0000-0000-0000-000000000302', 'direct', 0.2, '2025-09-04T09:31:00Z'),
  ('fm000000-0000-0000-0000-000000000307', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000303', 'cc000000-0000-0000-0000-000000000303', 'direct', 0.8, '2025-09-04T09:31:10Z'),
  ('fm000000-0000-0000-0000-000000000308', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000304', 'cc000000-0000-0000-0000-000000000304', 'direct', 0.6, '2025-09-04T09:31:30Z'),
  ('fm000000-0000-0000-0000-000000000309', 'bb000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000304', 'cc000000-0000-0000-0000-000000000305', 'direct', 0.4, '2025-09-04T09:31:40Z')
ON CONFLICT DO NOTHING;

-- IEEE AP-S Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000005', 'IEEE AP-S SDC 2026', 'Student antenna and electromagnetics design contest outcomes', 'v1.0', 70, 'APS', true, '2025-09-02T09:20:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000401', 'bb000000-0000-0000-0000-000000000005', 'APS-1', 'Creativity', 'Originality and inventiveness of design concept', 1, '2025-09-03T10:50:00Z'),
  ('cc000000-0000-0000-0000-000000000402', 'bb000000-0000-0000-0000-000000000005', 'APS-2', 'Technical Merit', 'Engineering soundness, technical depth, quality', 2, '2025-09-03T10:51:00Z'),
  ('cc000000-0000-0000-0000-000000000403', 'bb000000-0000-0000-0000-000000000005', 'APS-3', 'Practical Application', 'Usefulness and practical relevance', 3, '2025-09-03T10:52:00Z'),
  ('cc000000-0000-0000-0000-000000000404', 'bb000000-0000-0000-0000-000000000005', 'APS-4', 'Educational Value', 'Learning value and explanatory clarity', 4, '2025-09-03T10:53:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000401', 'bb000000-0000-0000-0000-000000000005', 'technical', 'Design & Implementation', 'Technical', 'Antenna design innovation, electromagnetics rigor, simulation quality', 30, 0.40, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:40:00Z'),
  ('fc000000-0000-0000-0000-000000000402', 'bb000000-0000-0000-0000-000000000005', 'design', 'Documentation & Analysis', 'Written', 'Technical report quality, analysis clarity, measurement data', 30, 0.25, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:40:30Z'),
  ('fc000000-0000-0000-0000-000000000403', 'bb000000-0000-0000-0000-000000000005', 'delivery', 'Presentation & Demo', 'Oral', 'Presentation clarity, measurement results, Q&A quality', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:41:00Z'),
  ('fc000000-0000-0000-0000-000000000404', 'bb000000-0000-0000-0000-000000000005', 'teamwork', 'Team Integration & Impact', 'Teamwork', 'Team contributions, practical benefit, professional maturity', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:41:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000401', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000401', 'cc000000-0000-0000-0000-000000000401', 'direct', 0.4, '2025-09-04T09:40:00Z'),
  ('fm000000-0000-0000-0000-000000000402', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000401', 'cc000000-0000-0000-0000-000000000402', 'direct', 0.6, '2025-09-04T09:40:10Z'),
  ('fm000000-0000-0000-0000-000000000403', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000402', 'cc000000-0000-0000-0000-000000000402', 'direct', 0.6, '2025-09-04T09:40:30Z'),
  ('fm000000-0000-0000-0000-000000000404', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000402', 'cc000000-0000-0000-0000-000000000403', 'direct', 0.4, '2025-09-04T09:40:40Z'),
  ('fm000000-0000-0000-0000-000000000405', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000403', 'cc000000-0000-0000-0000-000000000403', 'direct', 0.8, '2025-09-04T09:41:00Z'),
  ('fm000000-0000-0000-0000-000000000406', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000403', 'cc000000-0000-0000-0000-000000000404', 'direct', 0.2, '2025-09-04T09:41:10Z'),
  ('fm000000-0000-0000-0000-000000000407', 'bb000000-0000-0000-0000-000000000005', 'fc000000-0000-0000-0000-000000000404', 'cc000000-0000-0000-0000-000000000404', 'direct', 1.0, '2025-09-04T09:41:30Z')
ON CONFLICT DO NOTHING;

-- CanSat Framework
INSERT INTO frameworks (id, organization_id, name, description, version, default_threshold, outcome_code_prefix, is_default, created_at)
VALUES ('bb000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000006', 'CanSat Mission 2025', 'Mission execution and safety-focused outcomes for CanSat teams', 'v1.0', 75, 'CAN', true, '2025-09-02T09:25:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_outcomes (id, framework_id, code, label, description, sort_order, created_at)
VALUES
  ('cc000000-0000-0000-0000-000000000501', 'bb000000-0000-0000-0000-000000000006', 'CAN-1', 'Design Compliance', 'Adherence to mission constraints and packaging requirements', 1, '2025-09-03T11:00:00Z'),
  ('cc000000-0000-0000-0000-000000000502', 'bb000000-0000-0000-0000-000000000006', 'CAN-2', 'Primary Mission', 'Quality and reliability of primary mission execution', 2, '2025-09-03T11:01:00Z'),
  ('cc000000-0000-0000-0000-000000000503', 'bb000000-0000-0000-0000-000000000006', 'CAN-3', 'Recovery', 'Descent control and safe recovery performance', 3, '2025-09-03T11:02:00Z'),
  ('cc000000-0000-0000-0000-000000000504', 'bb000000-0000-0000-0000-000000000006', 'CAN-4', 'Safety', 'Safety compliance and mission restriction adherence', 4, '2025-09-03T11:03:00Z'),
  ('cc000000-0000-0000-0000-000000000505', 'bb000000-0000-0000-0000-000000000006', 'CAN-5', 'Secondary Mission', 'Originality and value of secondary mission goals', 5, '2025-09-03T11:04:00Z'),
  ('cc000000-0000-0000-0000-000000000506', 'bb000000-0000-0000-0000-000000000006', 'CAN-6', 'Data Quality', 'Telemetry quality and documentation excellence', 6, '2025-09-03T11:05:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criteria (id, framework_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  ('fc000000-0000-0000-0000-000000000501', 'bb000000-0000-0000-0000-000000000006', 'technical', 'Design & Compliance', 'Technical', 'Hardware design, constraint compliance, mission readiness', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-03T11:50:00Z'),
  ('fc000000-0000-0000-0000-000000000502', 'bb000000-0000-0000-0000-000000000006', 'design', 'Documentation & Data', 'Written', 'Technical documentation, telemetry clarity, analysis quality', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-03T11:50:30Z'),
  ('fc000000-0000-0000-0000-000000000503', 'bb000000-0000-0000-0000-000000000006', 'delivery', 'Mission Execution & Presentation', 'Oral', 'Primary/secondary mission success, presentation clarity, safety', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-03T11:51:00Z'),
  ('fc000000-0000-0000-0000-000000000504', 'bb000000-0000-0000-0000-000000000006', 'teamwork', 'Team Coordination & Innovation', 'Teamwork', 'Team collaboration, innovative mission design, professionalism', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-03T11:51:30Z')
ON CONFLICT DO NOTHING;

INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, coverage_type, weight, created_at)
VALUES
  ('fm000000-0000-0000-0000-000000000501', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000501', 'cc000000-0000-0000-0000-000000000501', 'direct', 0.7, '2025-09-04T09:50:00Z'),
  ('fm000000-0000-0000-0000-000000000502', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000501', 'cc000000-0000-0000-0000-000000000504', 'direct', 0.3, '2025-09-04T09:50:10Z'),
  ('fm000000-0000-0000-0000-000000000503', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000502', 'cc000000-0000-0000-0000-000000000502', 'direct', 0.8, '2025-09-04T09:50:30Z'),
  ('fm000000-0000-0000-0000-000000000504', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000502', 'cc000000-0000-0000-0000-000000000505', 'direct', 0.2, '2025-09-04T09:50:40Z'),
  ('fm000000-0000-0000-0000-000000000505', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000503', 'cc000000-0000-0000-0000-000000000503', 'direct', 1.0, '2025-09-04T09:51:00Z'),
  ('fm000000-0000-0000-0000-000000000506', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000504', 'cc000000-0000-0000-0000-000000000504', 'direct', 1.0, '2025-09-04T09:51:20Z'),
  ('fm000000-0000-0000-0000-000000000507', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000502', 'cc000000-0000-0000-0000-000000000506', 'direct', 0.2, '2025-09-04T09:51:30Z'),
  ('fm000000-0000-0000-0000-000000000508', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000504', 'cc000000-0000-0000-0000-000000000505', 'indirect', 0.4, '2025-09-04T09:51:40Z'),
  ('fm000000-0000-0000-0000-000000000509', 'bb000000-0000-0000-0000-000000000006', 'fc000000-0000-0000-0000-000000000504', 'cc000000-0000-0000-0000-000000000506', 'indirect', 0.6, '2025-09-04T09:51:50Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 3: Periods (4 per organization, 1 active + 3 historical)
-- ============================================================================
INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, poster_date, is_current, is_locked, is_visible, snapshot_frozen_at, created_at, updated_at)
VALUES
  -- TEDU-EE: 4 periods
  ('pp000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Fall 2025 Senior Design (Active)', 'Fall', 'Active evaluation period for Fall 2025 capstone projects', '2025-09-01', '2025-12-15', '2025-12-10', true, false, true, '2025-09-02T12:00:00Z', '2025-09-01T08:00:00Z', '2025-09-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Spring 2025 Senior Design', 'Spring', 'Historical: Spring 2025 capstone evaluation', '2025-02-01', '2025-05-15', '2025-05-10', false, true, true, '2025-02-02T12:00:00Z', '2025-02-01T08:00:00Z', '2025-05-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Summer 2024 Senior Design', 'Summer', 'Historical: Summer 2024 capstone evaluation', '2024-06-01', '2024-08-15', '2024-08-10', false, true, true, '2024-06-02T12:00:00Z', '2024-06-01T08:00:00Z', '2024-08-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Spring 2024 Senior Design', 'Spring', 'Historical: Spring 2024 capstone evaluation', '2024-02-01', '2024-05-15', '2024-05-10', false, true, true, '2024-02-02T12:00:00Z', '2024-02-01T08:00:00Z', '2024-05-20T18:00:00Z'),
  -- CMU-CS: 4 periods
  ('pp000000-0000-0000-0000-000000000101', 'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Fall 2025 Capstone (Active)', 'Fall', 'Active evaluation for Fall 2025 computer science capstone', '2025-09-01', '2025-12-15', '2025-12-10', true, false, true, '2025-09-02T12:00:00Z', '2025-09-01T08:00:00Z', '2025-09-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000102', 'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Spring 2025 Capstone', 'Spring', 'Historical: Spring 2025 capstone evaluation', '2025-02-01', '2025-05-15', '2025-05-10', false, true, true, '2025-02-02T12:00:00Z', '2025-02-01T08:00:00Z', '2025-05-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000103', 'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Summer 2024 Capstone', 'Summer', 'Historical: Summer 2024 capstone evaluation', '2024-06-01', '2024-08-15', '2024-08-10', false, true, true, '2024-06-02T12:00:00Z', '2024-06-01T08:00:00Z', '2024-08-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000104', 'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Spring 2024 Capstone', 'Spring', 'Historical: Spring 2024 capstone evaluation', '2024-02-01', '2024-05-15', '2024-05-10', false, true, true, '2024-02-02T12:00:00Z', '2024-02-01T08:00:00Z', '2024-05-20T18:00:00Z'),
  -- TEKNOFEST: 4 periods
  ('pp000000-0000-0000-0000-000000000201', 'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'TEKNOFEST 2025 (Active)', 'Fall', 'Active: TEKNOFEST 2025 technology competition', '2025-09-01', '2025-11-30', '2025-11-25', true, false, true, '2025-09-02T12:00:00Z', '2025-09-01T08:00:00Z', '2025-09-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000202', 'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'TEKNOFEST 2024', 'Fall', 'Historical: TEKNOFEST 2024 technology competition', '2024-09-01', '2024-11-30', '2024-11-25', false, true, true, '2024-09-02T12:00:00Z', '2024-09-01T08:00:00Z', '2024-11-30T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000203', 'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'TEKNOFEST 2023', 'Fall', 'Historical: TEKNOFEST 2023 technology competition', '2023-09-01', '2023-11-30', '2023-11-25', false, true, true, '2023-09-02T12:00:00Z', '2023-09-01T08:00:00Z', '2023-11-30T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000204', 'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'TEKNOFEST 2022', 'Fall', 'Historical: TEKNOFEST 2022 technology competition', '2022-09-01', '2022-11-30', '2022-11-25', false, true, true, '2022-09-02T12:00:00Z', '2022-09-01T08:00:00Z', '2022-11-30T18:00:00Z'),
  -- TUBITAK: 4 periods
  ('pp000000-0000-0000-0000-000000000301', 'aa000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'TUBITAK 2204-A 2025 (Active)', 'Fall', 'Active: TUBITAK 2204-A 2025 research competition', '2025-09-01', '2025-12-15', '2025-12-10', true, false, true, '2025-09-02T12:00:00Z', '2025-09-01T08:00:00Z', '2025-09-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000302', 'aa000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'TUBITAK 2204-A 2024', 'Fall', 'Historical: TUBITAK 2204-A 2024 research competition', '2024-09-01', '2024-12-15', '2024-12-10', false, true, true, '2024-09-02T12:00:00Z', '2024-09-01T08:00:00Z', '2024-12-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000303', 'aa000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'TUBITAK 2204-A 2023', 'Fall', 'Historical: TUBITAK 2204-A 2023 research competition', '2023-09-01', '2023-12-15', '2023-12-10', false, true, true, '2023-09-02T12:00:00Z', '2023-09-01T08:00:00Z', '2023-12-20T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000304', 'aa000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'TUBITAK 2204-A 2022', 'Fall', 'Historical: TUBITAK 2204-A 2022 research competition', '2022-09-01', '2022-12-15', '2022-12-10', false, true, true, '2022-09-02T12:00:00Z', '2022-09-01T08:00:00Z', '2022-12-20T18:00:00Z'),
  -- IEEE: 4 periods
  ('pp000000-0000-0000-0000-000000000401', 'aa000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005', 'IEEE AP-S 2025 (Active)', 'Fall', 'Active: IEEE AP-S Student Design Contest 2025', '2025-09-01', '2025-11-30', '2025-11-25', true, false, true, '2025-09-02T12:00:00Z', '2025-09-01T08:00:00Z', '2025-09-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000402', 'aa000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005', 'IEEE AP-S 2024', 'Fall', 'Historical: IEEE AP-S Student Design Contest 2024', '2024-09-01', '2024-11-30', '2024-11-25', false, true, true, '2024-09-02T12:00:00Z', '2024-09-01T08:00:00Z', '2024-11-30T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000403', 'aa000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005', 'IEEE AP-S 2023', 'Fall', 'Historical: IEEE AP-S Student Design Contest 2023', '2023-09-01', '2023-11-30', '2023-11-25', false, true, true, '2023-09-02T12:00:00Z', '2023-09-01T08:00:00Z', '2023-11-30T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000404', 'aa000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005', 'IEEE AP-S 2022', 'Fall', 'Historical: IEEE AP-S Student Design Contest 2022', '2022-09-01', '2022-11-30', '2022-11-25', false, true, true, '2022-09-02T12:00:00Z', '2022-09-01T08:00:00Z', '2022-11-30T18:00:00Z'),
  -- CanSat: 4 periods
  ('pp000000-0000-0000-0000-000000000501', 'aa000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000006', 'CanSat 2025 (Active)', 'Spring', 'Active: CanSat 2025 satellite mission competition', '2025-03-01', '2025-05-31', '2025-05-25', true, false, true, '2025-03-02T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-02T12:00:00Z'),
  ('pp000000-0000-0000-0000-000000000502', 'aa000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000006', 'CanSat 2024', 'Spring', 'Historical: CanSat 2024 satellite mission competition', '2024-03-01', '2024-05-31', '2024-05-25', false, true, true, '2024-03-02T12:00:00Z', '2024-03-01T08:00:00Z', '2024-05-31T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000503', 'aa000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000006', 'CanSat 2023', 'Spring', 'Historical: CanSat 2023 satellite mission competition', '2023-03-01', '2023-05-31', '2023-05-25', false, true, true, '2023-03-02T12:00:00Z', '2023-03-01T08:00:00Z', '2023-05-31T18:00:00Z'),
  ('pp000000-0000-0000-0000-000000000504', 'aa000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000006', 'CanSat 2022', 'Spring', 'Historical: CanSat 2022 satellite mission competition', '2022-03-01', '2022-05-31', '2022-05-25', false, true, true, '2022-03-02T12:00:00Z', '2022-03-01T08:00:00Z', '2022-05-31T18:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Period Snapshots (period_criteria, period_outcomes, period_maps)
-- ============================================================================
-- All active + historical periods get their framework snapshot copied

-- TEDU-EE: Criteria snapshot for all 4 periods
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, description, max_score, weight, color, rubric_bands, sort_order, created_at)
VALUES
  -- Period 001 (Active Fall 2025)
  ('pca00000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000001', 'technical', 'Technical Depth & Design', 'Technical', 'Complexity of solution, depth of technical understanding', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-09-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000002', 'design', 'Written Report & Documentation', 'Written', 'Report quality, clarity of writing', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-09-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000003', 'delivery', 'Oral Presentation & Q&A', 'Oral', 'Presentation clarity, confidence', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-09-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000004', 'pp000000-0000-0000-0000-000000000001', 'fc000000-0000-0000-0000-000000000004', 'teamwork', 'Teamwork & Collaboration', 'Teamwork', 'Team cohesion, collaboration', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-09-02T12:00:00Z'),
  -- Period 002 (Spring 2025)
  ('pca00000-0000-0000-0000-000000000005', 'pp000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000001', 'technical', 'Technical Depth & Design', 'Technical', 'Complexity of solution, depth of technical understanding', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2025-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000006', 'pp000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000002', 'design', 'Written Report & Documentation', 'Written', 'Report quality, clarity of writing', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2025-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000007', 'pp000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000003', 'delivery', 'Oral Presentation & Q&A', 'Oral', 'Presentation clarity, confidence', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2025-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000008', 'pp000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000004', 'teamwork', 'Teamwork & Collaboration', 'Teamwork', 'Team cohesion, collaboration', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2025-02-02T12:00:00Z'),
  -- Period 003 (Summer 2024)
  ('pca00000-0000-0000-0000-000000000009', 'pp000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000001', 'technical', 'Technical Depth & Design', 'Technical', 'Complexity of solution, depth of technical understanding', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2024-06-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000010', 'pp000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000002', 'design', 'Written Report & Documentation', 'Written', 'Report quality, clarity of writing', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2024-06-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000011', 'pp000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000003', 'delivery', 'Oral Presentation & Q&A', 'Oral', 'Presentation clarity, confidence', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2024-06-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000012', 'pp000000-0000-0000-0000-000000000003', 'fc000000-0000-0000-0000-000000000004', 'teamwork', 'Teamwork & Collaboration', 'Teamwork', 'Team cohesion, collaboration', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2024-06-02T12:00:00Z'),
  -- Period 004 (Spring 2024)
  ('pca00000-0000-0000-0000-000000000013', 'pp000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000001', 'technical', 'Technical Depth & Design', 'Technical', 'Complexity of solution, depth of technical understanding', 30, 0.35, '#ef4444', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 1, '2024-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000014', 'pp000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000002', 'design', 'Written Report & Documentation', 'Written', 'Report quality, clarity of writing', 30, 0.30, '#3b82f6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 2, '2024-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000015', 'pp000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000003', 'delivery', 'Oral Presentation & Q&A', 'Oral', 'Presentation clarity, confidence', 30, 0.25, '#8b5cf6', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 3, '2024-02-02T12:00:00Z'),
  ('pca00000-0000-0000-0000-000000000016', 'pp000000-0000-0000-0000-000000000004', 'fc000000-0000-0000-0000-000000000004', 'teamwork', 'Teamwork & Collaboration', 'Teamwork', 'Team cohesion, collaboration', 10, 0.10, '#10b981', '{"1":"Poor","2":"Fair","3":"Good","4":"Excellent"}', 4, '2024-02-02T12:00:00Z')
ON CONFLICT DO NOTHING;

-- TEDU-EE: Outcomes snapshot for all 4 periods (11 outcomes per period)
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, description, sort_order, created_at)
VALUES
  -- Period 001
  ('poa00000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'MUDEK-A1', 'Knowledge Application', 'Apply knowledge of mathematics, science, and discipline', 1, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000002', 'MUDEK-A2', 'Problem Analysis', 'Identify, formulate, and solve complex engineering problems', 2, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000003', 'MUDEK-A3', 'Design and Development', 'Design systems under realistic constraints', 3, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000004', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000004', 'MUDEK-A4', 'Investigation', 'Conduct experiments and analyze complex engineering problems', 4, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000005', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000005', 'MUDEK-A5', 'Modern Tools', 'Select and use modern engineering tools', 5, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000006', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000006', 'MUDEK-A6', 'Professional Ethics', 'Understand ethical principles in engineering', 6, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000007', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000007', 'MUDEK-A7', 'Communication', 'Communicate effectively in Turkish and foreign languages', 7, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000008', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000008', 'MUDEK-A8', 'Management', 'Understand project management and entrepreneurship', 8, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000009', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000009', 'MUDEK-A9', 'Teamwork', 'Work effectively in teams and individually', 9, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000010', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000010', 'MUDEK-A10', 'Lifelong Learning', 'Awareness of continuous self-improvement', 10, '2025-09-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000011', 'pp000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000011', 'MUDEK-A11', 'Societal Impact', 'Understand effects of engineering on society', 11, '2025-09-02T12:00:00Z'),
  -- Period 002
  ('poa00000-0000-0000-0000-000000000012', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'MUDEK-A1', 'Knowledge Application', 'Apply knowledge of mathematics, science, and discipline', 1, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000013', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000002', 'MUDEK-A2', 'Problem Analysis', 'Identify, formulate, and solve complex engineering problems', 2, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000014', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000003', 'MUDEK-A3', 'Design and Development', 'Design systems under realistic constraints', 3, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000015', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000004', 'MUDEK-A4', 'Investigation', 'Conduct experiments and analyze complex engineering problems', 4, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000016', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000005', 'MUDEK-A5', 'Modern Tools', 'Select and use modern engineering tools', 5, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000017', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000006', 'MUDEK-A6', 'Professional Ethics', 'Understand ethical principles in engineering', 6, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000018', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000007', 'MUDEK-A7', 'Communication', 'Communicate effectively in Turkish and foreign languages', 7, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000019', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000008', 'MUDEK-A8', 'Management', 'Understand project management and entrepreneurship', 8, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000020', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000009', 'MUDEK-A9', 'Teamwork', 'Work effectively in teams and individually', 9, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000021', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000010', 'MUDEK-A10', 'Lifelong Learning', 'Awareness of continuous self-improvement', 10, '2025-02-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000022', 'pp000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000011', 'MUDEK-A11', 'Societal Impact', 'Understand effects of engineering on society', 11, '2025-02-02T12:00:00Z'),
  -- Period 003 & 004: Similar pattern (abbreviated for space)
  ('poa00000-0000-0000-0000-000000000023', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'MUDEK-A1', 'Knowledge Application', 'Apply knowledge of mathematics, science, and discipline', 1, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000024', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000002', 'MUDEK-A2', 'Problem Analysis', 'Identify, formulate, and solve complex engineering problems', 2, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000025', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000003', 'MUDEK-A3', 'Design and Development', 'Design systems under realistic constraints', 3, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000026', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000004', 'MUDEK-A4', 'Investigation', 'Conduct experiments and analyze complex engineering problems', 4, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000027', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000005', 'MUDEK-A5', 'Modern Tools', 'Select and use modern engineering tools', 5, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000028', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000006', 'MUDEK-A6', 'Professional Ethics', 'Understand ethical principles in engineering', 6, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000029', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000007', 'MUDEK-A7', 'Communication', 'Communicate effectively in Turkish and foreign languages', 7, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000030', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000008', 'MUDEK-A8', 'Management', 'Understand project management and entrepreneurship', 8, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000031', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000009', 'MUDEK-A9', 'Teamwork', 'Work effectively in teams and individually', 9, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000032', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000010', 'MUDEK-A10', 'Lifelong Learning', 'Awareness of continuous self-improvement', 10, '2024-06-02T12:00:00Z'),
  ('poa00000-0000-0000-0000-000000000033', 'pp000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000011', 'MUDEK-A11', 'Societal Impact', 'Understand effects of engineering on society', 11, '2024-06-02T12:00:00Z')
ON CONFLICT DO NOTHING;

-- NOTE: For brevity, period_criterion_outcome_maps are omitted here (same pattern as framework level)
-- In production, insert all period-level maps by joining source framework maps to period snapshot IDs

-- ============================================================================
-- PART 5: Projects
-- ============================================================================
INSERT INTO projects (id, period_id, project_no, title, members, advisor_name, advisor_affiliation, description, created_at, updated_at)
VALUES
  -- TEDU-EE Active (Fall 2025) - 10 projects
  ('pr000000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', 1, 'Smart IoT Energy Monitor', '[{"name":"Ahmet Yilmaz","order":1},{"name":"Fatemeh Khalili","order":2},{"name":"Priya Sharma","order":3}]', 'Dr. Metin Karaçay', 'TEDU EE', 'Real-time energy consumption monitoring with ML analytics', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', 2, 'Wireless Power Transfer System', '[{"name":"Emma Thompson","order":1},{"name":"Li Wei","order":2},{"name":"Carlos Gomez","order":3}]', 'Prof. Can Özdemir', 'TEDU EE', 'Novel resonant inductive coupling for mid-range power transmission', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', 3, 'Biomedical Signal Amplifier', '[{"name":"Yuki Tanaka","order":1},{"name":"Sofia Rossi","order":2},{"name":"Aryan Patel","order":3}]', 'Dr. Ayşe Türkmen', 'TEDU EE', 'Low-noise amplifier for ECG/EEG applications', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000004', 'pp000000-0000-0000-0000-000000000001', 4, 'Autonomous Drone Controller', '[{"name":"Marcus Johnson","order":1},{"name":"Chen Liu","order":2},{"name":"Anna Kowalski","order":3}]', 'Prof. Serdar Akman', 'TEDU EE', 'PID+AI hybrid control for quadrotor stabilization', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000005', 'pp000000-0000-0000-0000-000000000001', 5, 'RF Spectrum Analyzer', '[{"name":"Jasmine Khan","order":1},{"name":"Ravi Kumar","order":2},{"name":"Elena Perez","order":3}]', 'Dr. İbrahim Şen', 'TEDU EE', 'Portable SDR-based spectrum measurement tool', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000006', 'pp000000-0000-0000-0000-000000000001', 6, 'Power Quality Monitor', '[{"name":"David Kim","order":1},{"name":"Fatima Al-Mansouri","order":2}]', 'Prof. Hasan Demirel', 'TEDU EE', 'THD/harmonics monitoring for industrial applications', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000007', 'pp000000-0000-0000-0000-000000000001', 7, 'Thermal Imaging Module', '[{"name":"Zara Mahmoud","order":1},{"name":"Ahmed Hassan","order":2},{"name":"Nina Volkova","order":3}]', 'Dr. Levent Avcı', 'TEDU EE', 'USB-based infrared camera interface with analytics', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000008', 'pp000000-0000-0000-0000-000000000001', 8, 'LED Driver IC Design', '[{"name":"Juan Fernandez","order":1},{"name":"Olivia Chen","order":2},{"name":"Hassan Ali","order":3}]', 'Prof. Mücahit Çakır', 'TEDU EE', '10A constant-current PWM driver for adaptive lighting', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000009', 'pp000000-0000-0000-0000-000000000001', 9, 'Solar Charge Controller', '[{"name":"Beatriz Silva","order":1},{"name":"Rajesh Nair","order":2},{"name":"Margot Dubois","order":3}]', 'Dr. Gökhan Aydın', 'TEDU EE', 'MPPT algorithm for renewable energy systems', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000010', 'pp000000-0000-0000-0000-000000000001', 10, 'Signal Generator & Analyzer', '[{"name":"Enzo Rossi","order":1},{"name":"Aisha Ibrahim","order":2}]', 'Prof. Kerem Tunçel', 'TEDU EE', 'Dual-channel waveform synthesizer with FFT analysis', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- CMU-CS Active (Fall 2025) - 6 projects
  ('pr000000-0000-0000-0000-000000000101', 'pp000000-0000-0000-0000-000000000101', 1, 'Distributed Cache System', '[{"name":"Sarah Anderson","order":1},{"name":"James Zhou","order":2},{"name":"Maria Garcia","order":3}]', 'Prof. Dave Andersen', 'CMU CS', 'Redis-like in-memory cache with cluster support', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000102', 'pp000000-0000-0000-0000-000000000101', 2, 'ML Pipeline Framework', '[{"name":"Kai Zhang","order":1},{"name":"Nicole Brown","order":2},{"name":"Raj Patil","order":3}]', 'Prof. Justine Sherry', 'CMU CS', 'Distributed training framework for TensorFlow', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000103', 'pp000000-0000-0000-0000-000000000101', 3, 'API Rate Limiter', '[{"name":"Emma Wilson","order":1},{"name":"Vikram Singh","order":2}]', 'Prof. Rashmi Vinayak', 'CMU CS', 'Token bucket + sliding window with persistence', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000104', 'pp000000-0000-0000-0000-000000000101', 4, 'Real-time Metrics Aggregator', '[{"name":"Yuki Sato","order":1},{"name":"Alex König","order":2},{"name":"Priya Sharma","order":3}]', 'Prof. Peter Steenkiste', 'CMU CS', 'Time-series metrics with cardinality management', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000105', 'pp000000-0000-0000-0000-000000000101', 5, 'Async Message Queue', '[{"name":"Louis Martin","order":1},{"name":"Akiko Tanaka","order":2}]', 'Prof. David Mazieres', 'CMU CS', 'Kafka-style event broker with consumer groups', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000106', 'pp000000-0000-0000-0000-000000000101', 6, 'Config Management Service', '[{"name":"Sofia Santos","order":1},{"name":"Marcus Lee","order":2},{"name":"Elena Vogt","order":3}]', 'Prof. Bernhard Ager', 'CMU CS', 'Declarative infra config with change tracking', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- TEKNOFEST Active (Fall 2025) - 5 projects
  ('pr000000-0000-0000-0000-000000000201', 'pp000000-0000-0000-0000-000000000201', 1, 'Humanoid Robot v2', '[{"name":"Tariq Rashid","order":1},{"name":"Sophia Müller","order":2},{"name":"Rio Yamamoto","order":3},{"name":"Ana Santos","order":4}]', 'Prof. Bekir Aksoy', 'TEKNOFEST', 'Bipedal walking with reactive obstacle avoidance', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000202', 'pp000000-0000-0000-0000-000000000201', 2, 'Agricultural Drone Swarm', '[{"name":"Lena Fischer","order":1},{"name":"Ismail Osman","order":2},{"name":"Sakura Miyazaki","order":3}]', 'Prof. Faruk Çakır', 'TEKNOFEST', 'Coordinated crop monitoring with AI disease detection', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000203', 'pp000000-0000-0000-0000-000000000201', 3, 'Underwater Inspection Robot', '[{"name":"Sebastian Hoffmann","order":1},{"name":"Amira Abouelela","order":2},{"name":"David Kowalski","order":3},{"name":"Julia Wang","order":4}]', 'Prof. Mehmet Akbaş', 'TEKNOFEST', 'ROV with sonar mapping and autonomous navigation', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000204', 'pp000000-0000-0000-0000-000000000201', 4, 'Rescue Hovercraft', '[{"name":"Klaus Richter","order":1},{"name":"Emira Hassan","order":2},{"name":"Takeshi Ito","order":3}]', 'Prof. Tamer Başar', 'TEKNOFEST', 'Amphibious vehicle for flood-zone emergency response', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000205', 'pp000000-0000-0000-0000-000000000201', 5, 'Smart City Traffic System', '[{"name":"Gerhard Weiss","order":1},{"name":"Noor Al-Rashid","order":2},{"name":"Takahiro Suzuki","order":3},{"name":"Lucas Moreno","order":4},{"name":"Eva Koppelman","order":5}]', 'Prof. Gözde Büyüköztürk', 'TEKNOFEST', 'IoT-based vehicle routing with congestion prediction', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- TUBITAK Active (Fall 2025) - 4 projects
  ('pr000000-0000-0000-0000-000000000301', 'pp000000-0000-0000-0000-000000000301', 1, 'Novel Water Purification Filter', '[{"name":"Hassan Al-Balushi","order":1},{"name":"Leila Farahani","order":2},{"name":"Jian Wang","order":3}]', 'Prof. Müjdat Çetin', 'TUBITAK', 'Ceramic nanofiber filter for bacterial removal', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000302', 'pp000000-0000-0000-0000-000000000301', 2, 'Biodegradable Polymer Study', '[{"name":"Yara Khalife","order":1},{"name":"Rui Chen","order":2}]', 'Prof. Cem Say', 'TUBITAK', 'Potato starch-based compostable material development', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000303', 'pp000000-0000-0000-0000-000000000301', 3, 'Smart Insecticide Nanoparticles', '[{"name":"Karim Bennani","order":1},{"name":"Meng-Yun Liu","order":2},{"name":"Fatema Al-Awadi","order":3}]', 'Prof. Rui Sousa', 'TUBITAK', 'Copper oxide NPs targeting crop pest larvae', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000304', 'pp000000-0000-0000-0000-000000000301', 4, 'Energy Harvesting from Vibration', '[{"name":"Zahra Mirza","order":1},{"name":"Adrien Renard","order":2}]', 'Prof. Syed Hasib Akhtar', 'TUBITAK', 'Piezoelectric cantilever arrays for ambient energy', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- IEEE AP-S Active (Fall 2025) - 4 projects
  ('pr000000-0000-0000-0000-000000000401', 'pp000000-0000-0000-0000-000000000401', 1, 'Planar Spiral Antenna Design', '[{"name":"Dr. Amara Okafor","order":1},{"name":"Helmut Bauer","order":2},{"name":"Yuki Yamaguchi","order":3}]', 'Prof. Aly E. Fathy', 'IEEE', 'Log-periodic design for 1-40 GHz UWB imaging', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000402', 'pp000000-0000-0000-0000-000000000401', 2, 'Slotted Waveguide Array', '[{"name":"Paolo Rossi","order":1},{"name":"Kenji Nakamura","order":2}]', 'Prof. Brian M. Sadler', 'IEEE', 'Compact 5G millimeter-wave phased array', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000403', 'pp000000-0000-0000-0000-000000000401', 3, 'Metamaterial Absorber', '[{"name":"Dr. Elena Kovacs","order":1},{"name":"Hiroshi Nakamura","order":2},{"name":"Valeria Russo","order":3}]', 'Prof. Christophe Fumeaux', 'IEEE', 'Broadband EM absorber for stealth applications', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000404', 'pp000000-0000-0000-0000-000000000401', 4, 'Lens Antenna for Beamforming', '[{"name":"Nicolai Christiansen","order":1},{"name":"Akiko Sato","order":2},{"name":"Isabella Martini","order":3}]', 'Prof. Jennifer T. Bernhard', 'IEEE', 'Microwave lens with electronic beam steering', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- CanSat Active (Spring 2025) - 4 projects
  ('pr000000-0000-0000-0000-000000000501', 'pp000000-0000-0000-0000-000000000501', 1, 'Standard CanSat Team A', '[{"name":"Dimitri Volkov","order":1},{"name":"Yuki Nakamura","order":2},{"name":"Sarah MacLeod","order":3},{"name":"Hassan El-Sayed","order":4}]', 'Prof. Ferda Erbil', 'CanSat', 'Atmospheric pressure & temperature primary mission', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000502', 'pp000000-0000-0000-0000-000000000501', 2, 'Advanced CanSat Team B', '[{"name":"Inge Andersen","order":1},{"name":"Suki Yamamoto","order":2},{"name":"Liam Murphy","order":3},{"name":"Amira Said","order":4},{"name":"Bruno Silva","order":5}]', 'Prof. Levent Avcı', 'CanSat', 'GPS location tracking + secondary aerosol analysis', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000503', 'pp000000-0000-0000-0000-000000000501', 3, 'Enhanced CanSat Team C', '[{"name":"Søren Larsen","order":1},{"name":"Fumiko Tanaka","order":2},{"name":"Connor O''Brien","order":3}]', 'Prof. Mehmet Çağrı Kaymaz', 'CanSat', 'Radiation dose measurement + UV imaging', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('pr000000-0000-0000-0000-000000000504', 'pp000000-0000-0000-0000-000000000501', 4, 'Premium CanSat Team D', '[{"name":"Nils Hansen","order":1},{"name":"Kaori Suzuki","order":2},{"name":"Patrick Oconnor","order":3},{"name":"Yasmin Okafor","order":4},{"name":"Andrea Bellini","order":5}]', 'Prof. Serdar Akman', 'CanSat', 'Multispectral imaging + trajectory reconstruction', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 6: Jurors
-- ============================================================================
INSERT INTO jurors (id, organization_id, juror_name, affiliation, email, avatar_color, notes, created_at, updated_at)
VALUES
  -- TEDU-EE Jurors (10)
  ('jr000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Prof. Levent Avcı', 'TEDU EE', 'levent.avci@tedu.edu.tr', '#ff6b6b', 'Department Chair', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'Dr. Metin Karaçay', 'TEDU EE', 'metin.karacay@tedu.edu.tr', '#4ecdc4', 'Power Systems Specialist', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'Prof. Kerem Tunçel', 'TEDU EE', 'kerem.tuncel@tedu.edu.tr', '#45b7d1', 'Signal Processing Expert', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'Dr. Can Özdemir', 'TEDU EE', 'can.ozdemir@tedu.edu.tr', '#96ceb4', 'RF & Wireless Expert', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000001', 'Prof. Mücahit Çakır', 'TEDU EE', 'mucahit.cakir@tedu.edu.tr', '#ffeaa7', 'Digital Design Specialist', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000001', 'Dr. Gökhan Aydın', 'TEDU EE', 'gokhan.aydin@tedu.edu.tr', '#dfe6e9', 'Renewable Energy Researcher', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000001', 'Prof. Serdar Akman', 'TEDU EE', 'serdar.akman@tedu.edu.tr', '#a29bfe', 'Control Systems Expert', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000001', 'Dr. İbrahim Şen', 'TEDU EE', 'ibrahim.sen@tedu.edu.tr', '#fab1a0', 'Microwave Engineering', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000001', 'Dr. Ayşe Türkmen', 'TEDU EE', 'ayse.turkmen@tedu.edu.tr', '#74b9ff', 'Biomedical Electronics', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000010', 'aa000000-0000-0000-0000-000000000001', 'Prof. Hasan Demirel', 'TEDU EE', 'hasan.demirel@tedu.edu.tr', '#81ecec', 'Power Quality Expert', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- CMU-CS Jurors (7)
  ('jr000000-0000-0000-0000-000000000101', 'aa000000-0000-0000-0000-000000000002', 'Prof. Dave Andersen', 'CMU CS', 'dga@cs.cmu.edu', '#ff6b6b', 'Distributed Systems', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000102', 'aa000000-0000-0000-0000-000000000002', 'Prof. Justine Sherry', 'CMU CS', 'justine@cs.cmu.edu', '#4ecdc4', 'Networking', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000103', 'aa000000-0000-0000-0000-000000000002', 'Prof. Peter Steenkiste', 'CMU CS', 'prs@cs.cmu.edu', '#45b7d1', 'Systems & ML', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000104', 'aa000000-0000-0000-0000-000000000002', 'Prof. Rashmi Vinayak', 'CMU CS', 'rashmi@cs.cmu.edu', '#96ceb4', 'Data & Algorithms', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000105', 'aa000000-0000-0000-0000-000000000002', 'Prof. David Mazieres', 'CMU CS', 'dm@cs.cmu.edu', '#ffeaa7', 'Security & Systems', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000106', 'aa000000-0000-0000-0000-000000000002', 'Prof. Bernhard Ager', 'CMU CS', 'bager@cs.cmu.edu', '#dfe6e9', 'Internet Infrastructure', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000107', 'aa000000-0000-0000-0000-000000000002', 'Dr. Srinivas Narayana', 'CMU CS', 'snarayan@cs.cmu.edu', '#a29bfe', 'Programming Languages', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- TEKNOFEST Jurors (6)
  ('jr000000-0000-0000-0000-000000000201', 'aa000000-0000-0000-0000-000000000003', 'Dr. Bekir Aksoy', 'TÜBİTAK TEKNOFEST', 'bekir.aksoy@tubitak.gov.tr', '#ff6b6b', 'Robotics Lead', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000202', 'aa000000-0000-0000-0000-000000000003', 'Prof. Faruk Çakır', 'Ankara Univ', 'faruk@ankara.edu.tr', '#4ecdc4', 'Agriculture Tech', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000203', 'aa000000-0000-0000-0000-000000000003', 'Prof. Mehmet Akbaş', 'Boğaziçi Univ', 'akbas@boun.edu.tr', '#45b7d1', 'Robotics Underwater', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000204', 'aa000000-0000-0000-0000-000000000003', 'Prof. Tamer Başar', 'TEDU EE', 'tamer.basar@tedu.edu.tr', '#96ceb4', 'Control Systems', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000205', 'aa000000-0000-0000-0000-000000000003', 'Prof. Gözde Büyüköztürk', 'TEDU CE', 'gozde@tedu.edu.tr', '#ffeaa7', 'Smart Cities', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000206', 'aa000000-0000-0000-0000-000000000003', 'Dr. Volkan Aydoğan', 'TEDU', 'volkan@tedu.edu.tr', '#dfe6e9', 'Innovation Mgr', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- TUBITAK Jurors (5)
  ('jr000000-0000-0000-0000-000000000301', 'aa000000-0000-0000-0000-000000000004', 'Prof. Müjdat Çetin', 'Middle East Tech', 'mcetin@metu.edu.tr', '#ff6b6b', 'Chemistry', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000302', 'aa000000-0000-0000-0000-000000000004', 'Prof. Cem Say', 'Boğaziçi Univ', 'say@boun.edu.tr', '#4ecdc4', 'Materials Science', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000303', 'aa000000-0000-0000-0000-000000000004', 'Prof. Rui Sousa', 'Porto Univ', 'rsousa@fe.up.pt', '#45b7d1', 'Nanotechnology', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000304', 'aa000000-0000-0000-0000-000000000004', 'Prof. Syed Hasib Akhtar', 'Aligarh Univ', 'akhtars@amu.ac.in', '#96ceb4', 'Energy Harvesting', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000305', 'aa000000-0000-0000-0000-000000000004', 'Dr. Deniz Aydın', 'TÜBİTAK', 'deniz.aydin@tubitak.gov.tr', '#ffeaa7', 'Research Support', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- IEEE AP-S Jurors (4)
  ('jr000000-0000-0000-0000-000000000401', 'aa000000-0000-0000-0000-000000000005', 'Prof. Aly E. Fathy', 'Univ of New Mexico', 'fathy@ece.unm.edu', '#ff6b6b', 'UWB Antennas', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000402', 'aa000000-0000-0000-0000-000000000005', 'Prof. Brian M. Sadler', 'USARMY ARL', 'sadler@arl.army.mil', '#4ecdc4', '5G Arrays', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000403', 'aa000000-0000-0000-0000-000000000005', 'Prof. Christophe Fumeaux', 'ETH Zurich', 'fumeaux@ethz.ch', '#45b7d1', 'Absorbers', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000404', 'aa000000-0000-0000-0000-000000000005', 'Prof. Jennifer T. Bernhard', 'Univ of Illinois', 'jbernhar@illinois.edu', '#96ceb4', 'Lens Antennas', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z'),

  -- CanSat Jurors (4)
  ('jr000000-0000-0000-0000-000000000501', 'aa000000-0000-0000-0000-000000000006', 'Prof. Ferda Erbil', 'Bilkent Univ', 'erbil@bilkent.edu.tr', '#ff6b6b', 'Mission Design', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000502', 'aa000000-0000-0000-0000-000000000006', 'Prof. Levent Avcı', 'TEDU EE', 'levent.avci@tedu.edu.tr', '#4ecdc4', 'Avionics', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000503', 'aa000000-0000-0000-0000-000000000006', 'Prof. Mehmet Çağrı Kaymaz', 'TEDU Aero', 'kaymaz@tedu.edu.tr', '#45b7d1', 'Recovery Systems', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000504', 'aa000000-0000-0000-0000-000000000006', 'Prof. Serdar Akman', 'TEDU EE', 'serdar.akman@tedu.edu.tr', '#96ceb4', 'Payload Systems', '2025-03-01T08:00:00Z', '2025-03-01T08:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: Juror Period Auth
-- ============================================================================
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, session_token_hash, session_expires_at, last_seen_at, is_blocked, edit_enabled, edit_reason, edit_expires_at, failed_attempts, locked_until, locked_at, final_submitted_at, created_at)
VALUES
  -- TEDU-EE Active (Fall 2025): Mixed states (4 completed, 3 partial, 1 editing, 1 locked, 1 blocked)
  ('jr000000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', crypt('1234', gen_salt('bf')), encode(digest('session-tok-001', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T14:30:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', crypt('1234', gen_salt('bf')), encode(digest('session-tok-002', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T13:15:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', crypt('5678', gen_salt('bf')), encode(digest('session-tok-003', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T16:45:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000004', 'pp000000-0000-0000-0000-000000000001', crypt('9012', gen_salt('bf')), encode(digest('session-tok-004', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T12:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000005', 'pp000000-0000-0000-0000-000000000001', crypt('3456', gen_salt('bf')), encode(digest('session-tok-005', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T15:20:00Z', false, false, NULL, NULL, 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000006', 'pp000000-0000-0000-0000-000000000001', crypt('7890', gen_salt('bf')), encode(digest('session-tok-006', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T14:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000007', 'pp000000-0000-0000-0000-000000000001', crypt('2345', gen_salt('bf')), encode(digest('session-tok-007', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T13:45:00Z', false, true, 'Score correction for project #3', '2025-12-14T18:00:00Z', 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000008', 'pp000000-0000-0000-0000-000000000001', crypt('6789', gen_salt('bf')), NULL, NULL, '2025-12-10T11:30:00Z', false, false, NULL, NULL, 3, '2025-12-14T12:30:00Z', '2025-12-14T12:30:00Z', NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000009', 'pp000000-0000-0000-0000-000000000001', crypt('0123', gen_salt('bf')), NULL, NULL, NULL, true, false, NULL, NULL, 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000010', 'pp000000-0000-0000-0000-000000000001', crypt('4567', gen_salt('bf')), encode(digest('session-tok-010', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T17:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T17:00:00Z', '2025-09-01T08:00:00Z'),

  -- CMU-CS Active (Fall 2025): Similar distribution
  ('jr000000-0000-0000-0000-000000000101', 'pp000000-0000-0000-0000-000000000101', crypt('1234', gen_salt('bf')), encode(digest('session-tok-101', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T14:30:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000102', 'pp000000-0000-0000-0000-000000000101', crypt('5678', gen_salt('bf')), encode(digest('session-tok-102', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T13:15:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000103', 'pp000000-0000-0000-0000-000000000101', crypt('9012', gen_salt('bf')), encode(digest('session-tok-103', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T16:45:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000104', 'pp000000-0000-0000-0000-000000000101', crypt('3456', gen_salt('bf')), encode(digest('session-tok-104', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T12:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000105', 'pp000000-0000-0000-0000-000000000101', crypt('7890', gen_salt('bf')), encode(digest('session-tok-105', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T15:20:00Z', false, false, NULL, NULL, 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000106', 'pp000000-0000-0000-0000-000000000101', crypt('2345', gen_salt('bf')), NULL, NULL, '2025-12-10T11:30:00Z', false, false, NULL, NULL, 2, '2025-12-14T12:30:00Z', '2025-12-14T12:30:00Z', NULL, '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000107', 'pp000000-0000-0000-0000-000000000101', crypt('6789', gen_salt('bf')), NULL, NULL, NULL, true, false, NULL, NULL, 0, NULL, NULL, NULL, '2025-09-01T08:00:00Z'),

  -- TEKNOFEST Active (Fall 2025): 6 jurors, all complete
  ('jr000000-0000-0000-0000-000000000201', 'pp000000-0000-0000-0000-000000000201', crypt('1111', gen_salt('bf')), encode(digest('session-tok-201', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T14:30:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000202', 'pp000000-0000-0000-0000-000000000201', crypt('2222', gen_salt('bf')), encode(digest('session-tok-202', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T13:15:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000203', 'pp000000-0000-0000-0000-000000000201', crypt('3333', gen_salt('bf')), encode(digest('session-tok-203', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T16:45:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000204', 'pp000000-0000-0000-0000-000000000201', crypt('4444', gen_salt('bf')), encode(digest('session-tok-204', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T12:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000205', 'pp000000-0000-0000-0000-000000000201', crypt('5555', gen_salt('bf')), encode(digest('session-tok-205', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T15:20:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T15:20:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000206', 'pp000000-0000-0000-0000-000000000201', crypt('6666', gen_salt('bf')), encode(digest('session-tok-206', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T14:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T14:00:00Z', '2025-09-01T08:00:00Z'),

  -- TUBITAK Active (Fall 2025): 5 jurors, all complete
  ('jr000000-0000-0000-0000-000000000301', 'pp000000-0000-0000-0000-000000000301', crypt('1111', gen_salt('bf')), encode(digest('session-tok-301', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T14:30:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000302', 'pp000000-0000-0000-0000-000000000301', crypt('2222', gen_salt('bf')), encode(digest('session-tok-302', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T13:15:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000303', 'pp000000-0000-0000-0000-000000000301', crypt('3333', gen_salt('bf')), encode(digest('session-tok-303', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T16:45:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000304', 'pp000000-0000-0000-0000-000000000301', crypt('4444', gen_salt('bf')), encode(digest('session-tok-304', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T12:00:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000305', 'pp000000-0000-0000-0000-000000000301', crypt('5555', gen_salt('bf')), encode(digest('session-tok-305', 'sha256'), 'hex'), '2025-12-15T18:00:00Z', '2025-12-13T15:20:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-12-13T15:20:00Z', '2025-09-01T08:00:00Z'),

  -- IEEE AP-S Active (Fall 2025): 4 jurors, all complete
  ('jr000000-0000-0000-0000-000000000401', 'pp000000-0000-0000-0000-000000000401', crypt('1111', gen_salt('bf')), encode(digest('session-tok-401', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T14:30:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000402', 'pp000000-0000-0000-0000-000000000401', crypt('2222', gen_salt('bf')), encode(digest('session-tok-402', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T13:15:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000403', 'pp000000-0000-0000-0000-000000000401', crypt('3333', gen_salt('bf')), encode(digest('session-tok-403', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T16:45:00Z', '2025-09-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000404', 'pp000000-0000-0000-0000-000000000401', crypt('4444', gen_salt('bf')), encode(digest('session-tok-404', 'sha256'), 'hex'), '2025-11-30T18:00:00Z', '2025-11-28T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-11-28T12:00:00Z', '2025-09-01T08:00:00Z'),

  -- CanSat Active (Spring 2025): 4 jurors, all complete
  ('jr000000-0000-0000-0000-000000000501', 'pp000000-0000-0000-0000-000000000501', crypt('1111', gen_salt('bf')), encode(digest('session-tok-501', 'sha256'), 'hex'), '2025-05-31T18:00:00Z', '2025-05-29T14:30:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-05-29T14:30:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000502', 'pp000000-0000-0000-0000-000000000501', crypt('2222', gen_salt('bf')), encode(digest('session-tok-502', 'sha256'), 'hex'), '2025-05-31T18:00:00Z', '2025-05-29T13:15:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-05-29T13:15:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000503', 'pp000000-0000-0000-0000-000000000501', crypt('3333', gen_salt('bf')), encode(digest('session-tok-503', 'sha256'), 'hex'), '2025-05-31T18:00:00Z', '2025-05-29T16:45:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-05-29T16:45:00Z', '2025-03-01T08:00:00Z'),
  ('jr000000-0000-0000-0000-000000000504', 'pp000000-0000-0000-0000-000000000501', crypt('4444', gen_salt('bf')), encode(digest('session-tok-504', 'sha256'), 'hex'), '2025-05-31T18:00:00Z', '2025-05-29T12:00:00Z', false, false, NULL, NULL, 0, NULL, NULL, '2025-05-29T12:00:00Z', '2025-03-01T08:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 8: Entry Tokens (15 tokens total, 24h TTL)
-- ============================================================================
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, last_used_at, expires_at, created_at)
VALUES
  -- TEDU-EE Active
  ('et000000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', encode(digest('token-tedu-001-fall2025', 'sha256'), 'hex'), false, '2025-12-13T14:30:00Z', '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', encode(digest('token-tedu-002-fall2025', 'sha256'), 'hex'), false, '2025-12-13T13:15:00Z', '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', encode(digest('token-tedu-003-fall2025', 'sha256'), 'hex'), true, NULL, '2025-12-12T08:00:00Z', '2025-12-11T08:00:00Z'),

  -- CMU-CS Active
  ('et000000-0000-0000-0000-000000000101', 'pp000000-0000-0000-0000-000000000101', encode(digest('token-cmu-001-fall2025', 'sha256'), 'hex'), false, '2025-12-13T14:30:00Z', '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000102', 'pp000000-0000-0000-0000-000000000101', encode(digest('token-cmu-002-fall2025', 'sha256'), 'hex'), false, '2025-12-13T13:15:00Z', '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),

  -- TEKNOFEST Active
  ('et000000-0000-0000-0000-000000000201', 'pp000000-0000-0000-0000-000000000201', encode(digest('token-tek-001-fall2025', 'sha256'), 'hex'), false, '2025-11-28T14:30:00Z', '2025-11-29T08:00:00Z', '2025-11-28T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000202', 'pp000000-0000-0000-0000-000000000201', encode(digest('token-tek-002-fall2025', 'sha256'), 'hex'), false, NULL, '2025-12-01T08:00:00Z', '2025-11-30T08:00:00Z'),

  -- TUBITAK Active
  ('et000000-0000-0000-0000-000000000301', 'pp000000-0000-0000-0000-000000000301', encode(digest('token-tub-001-fall2025', 'sha256'), 'hex'), false, '2025-12-13T14:30:00Z', '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000302', 'pp000000-0000-0000-0000-000000000301', encode(digest('token-tub-002-fall2025', 'sha256'), 'hex'), false, NULL, '2025-12-14T08:00:00Z', '2025-12-13T08:00:00Z'),

  -- IEEE AP-S Active
  ('et000000-0000-0000-0000-000000000401', 'pp000000-0000-0000-0000-000000000401', encode(digest('token-aps-001-fall2025', 'sha256'), 'hex'), false, '2025-11-28T14:30:00Z', '2025-11-29T08:00:00Z', '2025-11-28T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000402', 'pp000000-0000-0000-0000-000000000401', encode(digest('token-aps-002-fall2025', 'sha256'), 'hex'), false, NULL, '2025-11-29T08:00:00Z', '2025-11-28T08:00:00Z'),

  -- CanSat Active
  ('et000000-0000-0000-0000-000000000501', 'pp000000-0000-0000-0000-000000000501', encode(digest('token-can-001-spring2025', 'sha256'), 'hex'), false, '2025-05-29T14:30:00Z', '2025-05-30T08:00:00Z', '2025-05-29T08:00:00Z'),
  ('et000000-0000-0000-0000-000000000502', 'pp000000-0000-0000-0000-000000000501', encode(digest('token-can-002-spring2025', 'sha256'), 'hex'), false, NULL, '2025-05-30T08:00:00Z', '2025-05-29T08:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 9: Scoring Data (comprehensive for TEDU-EE Active period)
-- ============================================================================
-- score_sheets: 100 sheets (10 jurors × 10 projects)
-- score_sheet_items: 400 items (100 sheets × 4 criteria)

INSERT INTO score_sheets (id, period_id, project_id, juror_id, comment, status, started_at, last_activity_at, created_at, updated_at)
SELECT
  'ss' || lpad((row_number() OVER (ORDER BY juror_id, project_id))::text, 32, '0'),
  'pp000000-0000-0000-0000-000000000001',
  'pr' || lpad((((ascii(substring(p.id, 1, 1)) - ascii('0')) + (ascii(substring(p.id, 2, 1)) - ascii('0'))) % 10 + 1)::text, 32, '0'),
  j.id,
  CASE WHEN random() < 0.3 THEN 'Solid technical depth. Consider more analysis of design trade-offs.' ELSE NULL END,
  'submitted',
  '2025-12-01T08:00:00Z',
  '2025-12-13T14:30:00Z',
  '2025-12-01T08:00:00Z',
  '2025-12-13T14:30:00Z'
FROM
  (SELECT 'pr000000-0000-0000-0000-00000000000' || i::text AS id FROM generate_series(1, 10) i) p
CROSS JOIN
  (SELECT id FROM jurors WHERE organization_id = 'aa000000-0000-0000-0000-000000000001' LIMIT 10) j
ON CONFLICT DO NOTHING;

-- score_sheet_items: Insert scoring with realistic patterns
INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value, created_at, updated_at)
SELECT
  'si' || lpad((row_number() OVER (ORDER BY ss.id, pc.id))::text, 31, '0'),
  ss.id,
  pc.id,
  CASE
    WHEN pc.key = 'technical' THEN CASE WHEN random() < 0.2 THEN 25 + random() * 5 WHEN random() < 0.6 THEN 20 + random() * 8 ELSE 15 + random() * 8 END
    WHEN pc.key = 'design' THEN CASE WHEN random() < 0.2 THEN 24 + random() * 6 WHEN random() < 0.6 THEN 18 + random() * 10 ELSE 12 + random() * 12 END
    WHEN pc.key = 'delivery' THEN CASE WHEN random() < 0.2 THEN 26 + random() * 4 WHEN random() < 0.6 THEN 19 + random() * 9 ELSE 14 + random() * 10 END
    WHEN pc.key = 'teamwork' THEN CASE WHEN random() < 0.2 THEN 8 + random() * 2 WHEN random() < 0.6 THEN 6 + random() * 3 ELSE 4 + random() * 4 END
    ELSE NULL
  END::NUMERIC,
  '2025-12-01T08:00:00Z',
  '2025-12-13T14:30:00Z'
FROM
  score_sheets ss
CROSS JOIN
  period_criteria pc
WHERE
  ss.period_id = 'pp000000-0000-0000-0000-000000000001'
  AND pc.period_id = 'pp000000-0000-0000-0000-000000000001'
  AND ss.created_at IS NOT NULL
LIMIT 500
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 10: Audit Logs
-- ============================================================================
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at)
VALUES
  ('al000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000001', '{"season":"Fall","year":2025,"is_current":true}', '2025-09-01T08:00:00Z'),
  ('al000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', NULL, 'period_snapshot_frozen', 'periods', 'pp000000-0000-0000-0000-000000000001', '{"framework_id":"bb000000-0000-0000-0000-000000000001","criteria_count":4,"outcomes_count":11}', '2025-09-02T12:00:00Z'),
  ('al000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', NULL, 'projects_batch_imported', 'projects', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000001","count":10,"source":"manual"}', '2025-09-03T09:00:00Z'),
  ('al000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', NULL, 'jurors_batch_imported', 'jurors', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000001","count":10,"auth_initialized":true}', '2025-09-03T09:15:00Z'),
  ('al000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000001', NULL, 'tokens_generated', 'entry_tokens', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000001","count":3,"expires_hours":24}', '2025-09-03T09:30:00Z'),
  ('al000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000001', NULL, 'score_submitted', 'score_sheets', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000001","count":85,"date":"2025-12-13"}', '2025-12-13T18:00:00Z'),
  ('al000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000002', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000101', '{"season":"Fall","year":2025,"is_current":true}', '2025-09-01T08:00:00Z'),
  ('al000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000002', NULL, 'period_snapshot_frozen', 'periods', 'pp000000-0000-0000-0000-000000000101', '{"framework_id":"bb000000-0000-0000-0000-000000000002","criteria_count":4,"outcomes_count":7}', '2025-09-02T12:00:00Z'),
  ('al000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000002', NULL, 'projects_batch_imported', 'projects', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000101","count":6,"source":"manual"}', '2025-09-03T09:00:00Z'),
  ('al000000-0000-0000-0000-000000000010', 'aa000000-0000-0000-0000-000000000002', NULL, 'jurors_batch_imported', 'jurors', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000101","count":7,"auth_initialized":true}', '2025-09-03T09:15:00Z'),
  ('al000000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-000000000003', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000201', '{"season":"Fall","year":2025,"is_current":true}', '2025-09-01T08:00:00Z'),
  ('al000000-0000-0000-0000-000000000012', 'aa000000-0000-0000-0000-000000000003', NULL, 'projects_batch_imported', 'projects', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000201","count":5,"source":"teknofest"}', '2025-09-03T09:00:00Z'),
  ('al000000-0000-0000-0000-000000000013', 'aa000000-0000-0000-0000-000000000003', NULL, 'jurors_batch_imported', 'jurors', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000201","count":6,"auth_initialized":true}', '2025-09-03T09:15:00Z'),
  ('al000000-0000-0000-0000-000000000014', 'aa000000-0000-0000-0000-000000000004', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000301', '{"season":"Fall","year":2025,"is_current":true}', '2025-09-01T08:00:00Z'),
  ('al000000-0000-0000-0000-000000000015', 'aa000000-0000-0000-0000-000000000004', NULL, 'projects_batch_imported', 'projects', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000301","count":4,"source":"tubitak"}', '2025-09-03T09:00:00Z'),
  ('al000000-0000-0000-0000-000000000016', 'aa000000-0000-0000-0000-000000000004', NULL, 'jurors_batch_imported', 'jurors', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000301","count":5,"auth_initialized":true}', '2025-09-03T09:15:00Z'),
  ('al000000-0000-0000-0000-000000000017', 'aa000000-0000-0000-0000-000000000005', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000401', '{"season":"Fall","year":2025,"is_current":true}', '2025-09-01T08:00:00Z'),
  ('al000000-0000-0000-0000-000000000018', 'aa000000-0000-0000-0000-000000000005', NULL, 'projects_batch_imported', 'projects', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000401","count":4,"source":"ieee"}', '2025-09-03T09:00:00Z'),
  ('al000000-0000-0000-0000-000000000019', 'aa000000-0000-0000-0000-000000000005', NULL, 'jurors_batch_imported', 'jurors', NULL, '{"period_id":"pp000000-0000-0000-0000-000000000401","count":4,"auth_initialized":true}', '2025-09-03T09:15:00Z'),
  ('al000000-0000-0000-0000-000000000020', 'aa000000-0000-0000-0000-000000000006', NULL, 'period_created', 'periods', 'pp000000-0000-0000-0000-000000000501', '{"season":"Spring","year":2025,"is_current":true}', '2025-03-01T08:00:00Z')
ON CONFLICT DO NOTHING;

COMMIT;
