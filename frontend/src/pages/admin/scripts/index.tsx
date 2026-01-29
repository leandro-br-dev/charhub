import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageHeader } from '../../../hooks/usePageHeader';
import {
  adminScriptsService,
  type CorrectionStats,
  type ImageCompressionStats,
} from '../../../services/adminScripts';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';

// Ensure type is available
type CorrectionStatsType = CorrectionStats;

interface ScriptState {
  isLoading: boolean;
  lastRun: string | null;
  result: string | null;
}

type ScriptType = 'avatar' | 'data' | 'generation' | 'compression';

interface CompressionLimits {
  limit: number;
  maxSizeKB: number;
  targetSizeKB?: number;
}

export default function AdminScriptsPage(): JSX.Element {
  const { t } = useTranslation(['adminScripts', 'common']);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  useEffect(() => {
    setTitle(t('adminScripts:title'));
  }, [setTitle, t]);

  // State
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [compressionStats, setCompressionStats] = useState<ImageCompressionStats | null>(null);
  const [compressionStatsError, setCompressionStatsError] = useState<string | null>(null);

  const [scripts, setScripts] = useState<Record<ScriptType, ScriptState>>({
    avatar: { isLoading: false, lastRun: null, result: null },
    data: { isLoading: false, lastRun: null, result: null },
    generation: { isLoading: false, lastRun: null, result: null },
    compression: { isLoading: false, lastRun: null, result: null },
  });

  const [limits, setLimits] = useState<Record<ScriptType, number>>({
    avatar: 100,
    data: 100,
    generation: 10,
    compression: 100,
  });

  const [compressionLimits, setCompressionLimits] = useState<CompressionLimits>({
    limit: 100,
    maxSizeKB: 200,
    targetSizeKB: 200,
  });

  // Fetch correction stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);

    try {
      const response = await adminScriptsService.getCorrectionStats();
      console.log('[AdminScripts] Stats response:', response.data);

      // Ensure all required fields have default values
      const statsWithDefaults: CorrectionStats = {
        totalCharacters: response.data.totalCharacters ?? 0,
        charactersWithAvatars: response.data.charactersWithAvatars ?? 0,
        charactersWithoutAvatars: response.data.charactersWithoutAvatars ?? 0,
        charactersWithCompleteData: response.data.charactersWithCompleteData ?? 0,
        charactersWithIncompleteData: response.data.charactersWithIncompleteData ?? 0,
        lastAvatarCorrection: response.data.lastAvatarCorrection ?? null,
        lastDataCorrection: response.data.lastDataCorrection ?? null,
      };

      setStats(statsWithDefaults);

      // Update last run times
      setScripts((prev) => ({
        ...prev,
        avatar: { ...prev.avatar, lastRun: statsWithDefaults.lastAvatarCorrection },
        data: { ...prev.data, lastRun: statsWithDefaults.lastDataCorrection },
      }));
    } catch (err) {
      console.error('[AdminScripts] Failed to fetch stats:', err);
      setStatsError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      // Set default stats on error so UI doesn't crash
      setStats({
        totalCharacters: 0,
        charactersWithAvatars: 0,
        charactersWithoutAvatars: 0,
        charactersWithCompleteData: 0,
        charactersWithIncompleteData: 0,
        lastAvatarCorrection: null,
        lastDataCorrection: null,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch compression stats
  const fetchCompressionStats = useCallback(async () => {
    setCompressionStatsError(null);

    try {
      const response = await adminScriptsService.getImageCompressionStats();
      console.log('[AdminScripts] Compression stats response:', response.data);
      setCompressionStats(response.data);
    } catch (err) {
      console.error('[AdminScripts] Failed to fetch compression stats:', err);
      setCompressionStatsError(
        err instanceof Error ? err.message : 'Failed to fetch compression statistics'
      );
      setCompressionStats({
        totalImages: 0,
        oversizedCount: {},
        totalBytesOversized: 0,
      });
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCompressionStats();
  }, [fetchStats, fetchCompressionStats]);

  // Trigger script
  const triggerScript = async (type: ScriptType) => {
    setScripts((prev) => ({
      ...prev,
      [type]: { ...prev[type], isLoading: true, result: null },
    }));

    try {
      if (type === 'compression') {
        const response = await adminScriptsService.triggerImageCompression(
          compressionLimits.limit,
          compressionLimits.maxSizeKB,
          compressionLimits.targetSizeKB
        );

        setScripts((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isLoading: false,
            result: response.data.message,
            lastRun: new Date().toISOString(),
          },
        }));

        addToast(t('adminScripts:scripts.compression.success'), 'success');

        // Refresh compression stats after successful execution
        setTimeout(() => fetchCompressionStats(), 1000);
      } else {
        const limit = limits[type];
        const response =
          type === 'avatar'
            ? await adminScriptsService.triggerAvatarCorrection(limit)
            : type === 'data'
              ? await adminScriptsService.triggerDataCorrection(limit)
              : await adminScriptsService.triggerCharacterGeneration(limit);

        setScripts((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isLoading: false,
            result: response.data.message,
            lastRun: new Date().toISOString(),
          },
        }));

        addToast(t(`adminScripts:scripts.${type}.success`), 'success');

        // Refresh stats after successful execution
        setTimeout(() => fetchStats(), 1000);
      }
    } catch (err) {
      console.error(`[AdminScripts] Failed to trigger ${type} correction:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute script';
      setScripts((prev) => ({
        ...prev,
        [type]: { ...prev[type], isLoading: false, result: errorMessage },
      }));
      addToast(t(`adminScripts:scripts.${type}.error`), 'error');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return t('adminScripts:stats.never');
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full bg-normal px-4 md:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-title mb-2">
          {t('adminScripts:header.title')}
        </h1>
        <p className="text-muted">{t('adminScripts:header.description')}</p>
      </div>

      {/* Error State */}
      {statsError && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error">{statsError}</p>
          <button
            onClick={fetchStats}
            className="mt-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/80"
          >
            {t('common:retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingStats && !stats && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Content */}
      {stats && !isLoadingStats && (
        <div className="space-y-6">
          {/* Statistics Section */}
          <div className="bg-light rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-title mb-4">
              {t('adminScripts:stats.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Characters */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="text-sm text-muted mb-1">
                  {t('adminScripts:stats.totalCharacters')}
                </div>
                <div className="text-2xl font-bold text-title">
                  {stats.totalCharacters.toLocaleString()}
                </div>
              </div>

              {/* Avatar Statistics */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="text-sm text-muted mb-1">
                  {t('adminScripts:stats.charactersWithAvatars')}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-title">
                    {stats.charactersWithAvatars.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted">
                    / {stats.totalCharacters.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 w-full bg-border rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalCharacters > 0
                          ? (stats.charactersWithAvatars / stats.totalCharacters) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Data Completeness Statistics */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="text-sm text-muted mb-1">
                  {t('adminScripts:stats.charactersWithCompleteData')}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-title">
                    {stats.charactersWithCompleteData.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted">
                    / {stats.totalCharacters.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 w-full bg-border rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalCharacters > 0
                          ? (stats.charactersWithCompleteData / stats.totalCharacters) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Last Correction Times */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="text-sm text-muted mb-2">
                  {t('adminScripts:stats.lastCorrections')}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content">{t('adminScripts:scripts.avatar.name')}:</span>
                    <span className="text-muted">{formatDate(stats.lastAvatarCorrection)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content">{t('adminScripts:scripts.data.name')}:</span>
                    <span className="text-muted">{formatDate(stats.lastDataCorrection)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compression Statistics Section */}
          {compressionStats && (
            <div className="bg-light rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-title mb-4">
                {t('adminScripts:stats.compressionStats')}
              </h2>
              {compressionStatsError && (
                <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
                  <p className="text-error text-sm">{compressionStatsError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Images */}
                <div className="bg-normal rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted mb-1">
                    {t('adminScripts:stats.totalImages')}
                  </div>
                  <div className="text-2xl font-bold text-title">
                    {compressionStats.totalImages.toLocaleString()}
                  </div>
                </div>

                {/* Oversized Counts */}
                <div className="bg-normal rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted mb-2">
                    {t('adminScripts:stats.oversizedImages')}
                  </div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(compressionStats.oversizedCount).map(([threshold, count]) => (
                      <div key={threshold} className="flex justify-between">
                        <span className="text-content">{threshold}:</span>
                        <span className="text-title font-medium">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bytes That Could Be Saved */}
                <div className="bg-normal rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted mb-1">
                    {t('adminScripts:stats.bytesCouldBeSaved')}
                  </div>
                  <div className="text-2xl font-bold text-success">
                    {formatBytes(compressionStats.totalBytesOversized)}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {t('adminScripts:stats.maxSizeThreshold')}: 200 KB
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scripts Section */}
          <div className="bg-light rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-title mb-4">
              {t('adminScripts:scripts.title')}
            </h2>
            <div className="space-y-4">
              {/* Avatar Correction Script */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-title mb-1">
                      {t('adminScripts:scripts.avatar.name')}
                    </h3>
                    <p className="text-sm text-muted mb-2">
                      {t('adminScripts:scripts.avatar.description')}
                    </p>
                    {scripts.avatar.lastRun && (
                      <div className="text-xs text-muted">
                        {t('adminScripts:scripts.lastRun')}: {formatDate(scripts.avatar.lastRun)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.limit')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={limits.avatar}
                          onChange={(e) =>
                            setLimits((prev) => ({ ...prev, avatar: parseInt(e.target.value) || 100 }))
                          }
                          className="w-24 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.avatar.isLoading}
                          placeholder={t('adminScripts:scripts.limitPlaceholder')}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t('adminScripts:scripts.records')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerScript('avatar')}
                      disabled={scripts.avatar.isLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        scripts.avatar.isLoading
                          ? 'bg-muted text-muted cursor-not-allowed'
                          : 'bg-primary text-black hover:bg-primary/80'
                      }`}
                    >
                      {scripts.avatar.isLoading
                        ? t('adminScripts:scripts.running')
                        : t('adminScripts:scripts.run')}
                    </button>
                  </div>
                </div>
                {scripts.avatar.result && (
                  <div
                    className={`mt-3 p-3 rounded text-sm ${
                      scripts.avatar.result.includes('Failed') ||
                      scripts.avatar.result.includes('Error')
                        ? 'bg-error/10 text-error'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {scripts.avatar.result}
                  </div>
                )}
              </div>

              {/* Data Correction Script */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-title mb-1">
                      {t('adminScripts:scripts.data.name')}
                    </h3>
                    <p className="text-sm text-muted mb-2">
                      {t('adminScripts:scripts.data.description')}
                    </p>
                    {scripts.data.lastRun && (
                      <div className="text-xs text-muted">
                        {t('adminScripts:scripts.lastRun')}: {formatDate(scripts.data.lastRun)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.limit')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={limits.data}
                          onChange={(e) =>
                            setLimits((prev) => ({ ...prev, data: parseInt(e.target.value) || 100 }))
                          }
                          className="w-24 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.data.isLoading}
                          placeholder={t('adminScripts:scripts.limitPlaceholder')}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t('adminScripts:scripts.records')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerScript('data')}
                      disabled={scripts.data.isLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        scripts.data.isLoading
                          ? 'bg-muted text-muted cursor-not-allowed'
                          : 'bg-primary text-black hover:bg-primary/80'
                      }`}
                    >
                      {scripts.data.isLoading
                        ? t('adminScripts:scripts.running')
                        : t('adminScripts:scripts.run')}
                    </button>
                  </div>
                </div>
                {scripts.data.result && (
                  <div
                    className={`mt-3 p-3 rounded text-sm ${
                      scripts.data.result.includes('Failed') ||
                      scripts.data.result.includes('Error')
                        ? 'bg-error/10 text-error'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {scripts.data.result}
                  </div>
                )}
              </div>

              {/* Character Generation Script */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-title mb-1">
                      {t('adminScripts:scripts.generation.name')}
                    </h3>
                    <p className="text-sm text-muted mb-2">
                      {t('adminScripts:scripts.generation.description')}
                    </p>
                    {scripts.generation.lastRun && (
                      <div className="text-xs text-muted">
                        {t('adminScripts:scripts.lastRun')}: {formatDate(scripts.generation.lastRun)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.limit')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={limits.generation}
                          onChange={(e) =>
                            setLimits((prev) => ({
                              ...prev,
                              generation: parseInt(e.target.value) || 10,
                            }))
                          }
                          className="w-24 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.generation.isLoading}
                          placeholder={t('adminScripts:scripts.limitPlaceholder')}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t('adminScripts:scripts.characters')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerScript('generation')}
                      disabled={scripts.generation.isLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        scripts.generation.isLoading
                          ? 'bg-muted text-muted cursor-not-allowed'
                          : 'bg-primary text-black hover:bg-primary/80'
                      }`}
                    >
                      {scripts.generation.isLoading
                        ? t('adminScripts:scripts.running')
                        : t('adminScripts:scripts.run')}
                    </button>
                  </div>
                </div>
                {scripts.generation.result && (
                  <div
                    className={`mt-3 p-3 rounded text-sm ${
                      scripts.generation.result.includes('Failed') ||
                      scripts.generation.result.includes('Error')
                        ? 'bg-error/10 text-error'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {scripts.generation.result}
                  </div>
                )}
              </div>

              {/* Image Compression Script */}
              <div className="bg-normal rounded-lg p-4 border border-border">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-title mb-1">
                      {t('adminScripts:scripts.compression.name')}
                    </h3>
                    <p className="text-sm text-muted mb-2">
                      {t('adminScripts:scripts.compression.description')}
                    </p>
                    {scripts.compression.lastRun && (
                      <div className="text-xs text-muted">
                        {t('adminScripts:scripts.lastRun')}: {formatDate(scripts.compression.lastRun)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Limit Input */}
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.compression.limit')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={compressionLimits.limit}
                          onChange={(e) =>
                            setCompressionLimits((prev) => ({
                              ...prev,
                              limit: parseInt(e.target.value) || 100,
                            }))
                          }
                          className="w-20 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.compression.isLoading}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t('adminScripts:scripts.compression.images')}
                        </span>
                      </div>
                    </div>

                    {/* Max Size Input */}
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.compression.maxSizeKB')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="50"
                          max="5000"
                          value={compressionLimits.maxSizeKB}
                          onChange={(e) =>
                            setCompressionLimits((prev) => ({
                              ...prev,
                              maxSizeKB: parseInt(e.target.value) || 200,
                            }))
                          }
                          className="w-20 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.compression.isLoading}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">KB</span>
                      </div>
                    </div>

                    {/* Target Size Input */}
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">
                        {t('adminScripts:scripts.compression.targetSizeKB')}:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="50"
                          max="1000"
                          value={compressionLimits.targetSizeKB}
                          onChange={(e) =>
                            setCompressionLimits((prev) => ({
                              ...prev,
                              targetSizeKB: parseInt(e.target.value) || 200,
                            }))
                          }
                          className="w-20 px-3 py-2 rounded-lg border border-border bg-light text-content text-sm focus:outline-none focus:border-primary"
                          disabled={scripts.compression.isLoading}
                        />
                        <span className="text-xs text-muted whitespace-nowrap">KB</span>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerScript('compression')}
                      disabled={scripts.compression.isLoading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        scripts.compression.isLoading
                          ? 'bg-muted text-muted cursor-not-allowed'
                          : 'bg-primary text-black hover:bg-primary/80'
                      }`}
                    >
                      {scripts.compression.isLoading
                        ? t('adminScripts:scripts.running')
                        : t('adminScripts:scripts.run')}
                    </button>
                  </div>
                </div>
                {scripts.compression.result && (
                  <div
                    className={`mt-3 p-3 rounded text-sm ${
                      scripts.compression.result.includes('Failed') ||
                      scripts.compression.result.includes('Error')
                        ? 'bg-error/10 text-error'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {scripts.compression.result}
                  </div>
                )}
              </div>

              {/* More Scripts Placeholder */}
              <div className="bg-normal/50 rounded-lg p-4 border border-dashed border-border">
                <div className="text-center text-muted">
                  <p className="text-sm">{t('adminScripts:scripts.moreComing')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                fetchStats();
                fetchCompressionStats();
              }}
              disabled={isLoadingStats}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isLoadingStats
                  ? 'bg-muted text-muted cursor-not-allowed'
                  : 'bg-light text-content border border-border hover:border-primary'
              }`}
            >
              {t('adminScripts:refresh')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
