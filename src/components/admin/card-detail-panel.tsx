'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Card } from '@/types/cards';
import {
  SHAPES,
  MANA_COLORS,
  RARITY_COLORS,
  RARITY_LABELS,
  GEN_STATUS_LABELS,
  ABILITIES,
} from '@/lib/constants';

interface CardDetailPanelProps {
  card: Card;
  onApprove: () => void;
  onReject: () => void;
}

const QUALITY_CHECKLIST = [
  'Shape reads clearly at 512×512 thumbnail',
  'No text, letters, or numbers on the art',
  'VHS style is recognizable (grain, aberrations, warmth)',
  'Material matches rarity (flat ≠ 3D ≠ chrome ≠ gold)',
  'Color palette matches mana color',
  'Only one shape type in the art',
  'Background doesn\'t overpower the shape',
  'No AI artifacts (extra fingers, blurred details)',
  'Format is exactly 1:1 (square)',
  'No transparent background (opaque)',
];

function getArtDisplayUrl(rawArtPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return '';
  const fileName = rawArtPath.replace(/^raw-arts\//, '');
  return `${supabaseUrl}/storage/v1/object/public/raw-arts/${fileName}`;
}

export function CardDetailPanel({ card, onApprove, onReject }: CardDetailPanelProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    card.raw_art_path ? getArtDisplayUrl(card.raw_art_path) : null
  );
  const [checklist, setChecklist] = useState<boolean[]>(
    new Array(QUALITY_CHECKLIST.length).fill(false)
  );
  const [uploading, setUploading] = useState(false);

  const shapeDef = SHAPES.find((s) => s.shape === card.shape);
  const mana = MANA_COLORS[card.mana_color];
  const rarityColors = RARITY_COLORS[card.rarity_tier];
  const statusInfo = GEN_STATUS_LABELS[card.gen_status];
  const ability = ABILITIES.find((a) => a.name === card.ability);

  const isLocal = card.id.startsWith('local-');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  // Upload art to Supabase Storage via API, then approve
  const handleUploadAndApprove = useCallback(async () => {
    if (isLocal) {
      onApprove();
      return;
    }

    if (uploadedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('cardId', card.id);
        formData.append('cardNumber', String(card.card_number));
        formData.append('shape', card.shape);
        formData.append('material', card.material);
        formData.append('background', card.background);

        const res = await fetch('/api/upload/raw-art', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json();
          console.error('[Upload] Failed:', data.error);
        }
      } catch (e) {
        console.error('[Upload] Network error:', e);
      } finally {
        setUploading(false);
      }
    }

    onApprove();
  }, [uploadedFile, card, isLocal, onApprove]);

  const allChecked = checklist.every(Boolean);
  const checkedCount = checklist.filter(Boolean).length;

  return (
    <div className="h-full flex flex-col">
      <SheetHeader>
        <SheetTitle className="text-neutral-100 flex items-center gap-2">
          <span>{shapeDef?.emoji}</span>
          <span className="capitalize">{card.shape}</span>
          <span className="text-neutral-500">•</span>
          <span className="capitalize text-neutral-400">{card.material}</span>
          <span className="text-neutral-500">•</span>
          <span className="capitalize text-neutral-400">
            {card.background.replace('_', ' ')}
          </span>
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-4 mt-4">
        {/* Card Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Card #</span>
            <p className="font-mono">#{String(card.card_number).padStart(3, '0')}</p>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Wave</span>
            <p>Wave {card.wave}</p>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Mana</span>
            <p>{mana.emoji} {mana.label}</p>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Rarity</span>
            <Badge
              variant="outline"
              className={`${rarityColors.bg} ${rarityColors.text} ${rarityColors.border}`}
            >
              {RARITY_LABELS[card.rarity_tier]}
            </Badge>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Status</span>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-xs">Drop Rate</span>
            <p className="font-mono text-xs">{card.base_rarity_pct}% × {card.background_multiplier} = {(card.base_rarity_pct * card.background_multiplier).toFixed(4)}%</p>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h4 className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Stats</h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <div className="text-xs text-red-400">ATK</div>
              <div className="text-lg font-bold">{card.atk}</div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-400">DEF</div>
              <div className="text-lg font-bold">{card.def}</div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <div className="text-xs text-green-400">HP</div>
              <div className="text-lg font-bold">{card.hp}</div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <div className="text-xs text-purple-400">MANA</div>
              <div className="text-lg font-bold">{card.mana_cost}</div>
            </div>
          </div>
        </div>

        {/* Ability */}
        {ability && (
          <div>
            <h4 className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Ability</h4>
            <div className="bg-neutral-800 rounded-lg p-3">
              <span className="font-semibold text-sm">{ability.name}</span>
              <span className="text-neutral-400 text-sm ml-2">— {ability.description}</span>
            </div>
          </div>
        )}

        <Separator className="bg-neutral-800" />

        {/* Upload Zone */}
        <div>
          <h4 className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Raw Art</h4>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors
              ${isDragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
              }
            `}
          >
            <input {...getInputProps()} />
            {previewUrl ? (
              <div className="space-y-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-md"
                />
                <p className="text-xs text-neutral-400">
                  {uploadedFile
                    ? `${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)`
                    : 'Current art from storage'
                  }
                </p>
                <p className="text-xs text-neutral-500">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-3xl">📁</div>
                <p className="text-sm text-neutral-400">
                  Drop PNG/JPG here or click to upload
                </p>
                <p className="text-xs text-neutral-500">
                  2048×2048 recommended, max 20MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Checklist */}
        {previewUrl && (
          <div>
            <h4 className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
              Quality Checklist ({checkedCount}/{QUALITY_CHECKLIST.length})
            </h4>
            <div className="space-y-2">
              {QUALITY_CHECKLIST.map((item, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2 text-sm cursor-pointer hover:bg-neutral-800/50 rounded p-1 -mx-1"
                >
                  <Checkbox
                    checked={checklist[i]}
                    onCheckedChange={(checked) => {
                      const next = [...checklist];
                      next[i] = !!checked;
                      setChecklist(next);
                    }}
                    className="mt-0.5"
                  />
                  <span className={checklist[i] ? 'text-neutral-300' : 'text-neutral-500'}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-neutral-800 flex gap-2 mt-auto">
        <Button
          className="flex-1 bg-green-700 hover:bg-green-600 text-white"
          disabled={!previewUrl || !allChecked || uploading}
          onClick={handleUploadAndApprove}
        >
          {uploading ? 'Uploading...' : '✓ Approve'}
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-red-700 text-red-400 hover:bg-red-900/50"
          disabled={!previewUrl}
          onClick={onReject}
        >
          ✗ Reject
        </Button>
      </div>
    </div>
  );
}
