-- ═══════════════════════════════════════════════════════════
-- Prompts table — stores editable prompt templates
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'base', 'hero', 'land', 'artifact'
  label TEXT NOT NULL,                 -- Human-readable label
  content TEXT NOT NULL,               -- The prompt template text
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default prompts
INSERT INTO prompts (slug, label, content) VALUES
(
  'base',
  'Base Style Prompt',
  'You are an art director for a collectible card game set in Detroit, 1996. Everything is shot on VHS / disposable camera aesthetic — grainy, warm colors, harsh flash, lo-fi. The vibe is 90s hip-hop culture, street life, community.

Generate a vivid, cinematic visual description (2-3 sentences) for this card''s artwork. The description should be specific enough for an AI image generator to create the art. Focus on composition, lighting, setting, and mood. Detroit ''96 aesthetic is mandatory.'
),
(
  'hero',
  'Hero Card Template',
  'HERO CARD:
- Name: {{name}}
- Class: {{hero_class}} ({{class_context}})
- Color: {{color}}
- Rarity: {{rarity_tier}}
- ATK: {{atk}}, HP: {{hp}}
- Perk 1: {{perk_1_name}} — {{perk_1_desc}}
{{perk_2_line}}

Describe this character in a Detroit ''96 scene. Include their appearance, clothing, pose, and environment. The character''s power level should be reflected in the scene scale — {{rarity_scale}}.'
),
(
  'land',
  'Land Card Template',
  'LAND CARD (Mana Source):
- Name: {{name}}
- Color: {{color}} ({{color_context}})
- Shape: {{shape}}
- Material: {{material}}
- Rarity: {{rarity_tier}}

Describe a Detroit ''96 location that embodies the {{color}} mana color. The {{shape}} shape in {{material}} material should be subtly integrated into the scene — maybe as graffiti, an object, architecture detail, or held by someone. Material quality reflects rarity: {{material_context}}.'
),
(
  'artifact',
  'Artifact Card Template',
  'ARTIFACT CARD (Weapon/Equipment):
- Name: {{name}}
- Type: {{artifact_subtype}}
- Rarity: {{rarity_tier}}
- Effect: {{ability}}

Describe this item in a Detroit ''96 context. Show the {{name}} as if photographed on a table, in someone''s hands, or in use on the street. The item''s power should match its rarity: {{rarity_scale}}.'
)
ON CONFLICT (slug) DO NOTHING;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();
