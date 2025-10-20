import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useCharacterMutations, useCharacterQuery } from '../shared/hooks/useCharacterQueries';

export default function CharacterDetailPage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { deleteMutation } = useCharacterMutations();

  const fullName = useMemo(() => {
    if (!data) return '';
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [data, t]);

  const handleDelete = async () => {
    if (!data) return;
    const confirmation = window.confirm(t('characters:detail.confirmDelete'));
    if (!confirmation) return;
    try {
      await deleteMutation.mutateAsync(data.id);
      navigate('/characters');
    } catch (error) {
      console.error('[CharacterDetail] remove failed', error);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-300">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('characters:detail.states.loading')}</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-300">
        <span className="material-symbols-outlined text-5xl text-red-500">error</span>
        <p>{t('characters:detail.states.notFound')}</p>
        <Button type="button" onClick={() => navigate('/characters')} icon="arrow_back">
          {t('characters:detail.actions.backToHub')}
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900/80 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-6">
          <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {data.avatar ? (
              <img src={data.avatar} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-slate-400 dark:text-slate-500">
                <span className="material-symbols-outlined text-5xl">person</span>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
              {t(`characters:ageRatings.${data.ageRating}`)}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{fullName}</h1>
              {data.style && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{data.style}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
              {data.gender && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{data.gender}</span>}
              {data.species && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{data.species}</span>}
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                {data.isPublic ? t('characters:detail.labels.public') : t('characters:detail.labels.private')}
              </span>
            </div>
            <dl className="grid gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  {t('characters:detail.labels.createdAt')}
                </dt>
                <dd>{new Date(data.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  {t('characters:detail.labels.updatedAt')}
                </dt>
                <dd>{new Date(data.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" icon="edit" onClick={() => navigate(`/characters/${data.id}/edit`)}>
            {t('characters:detail.actions.edit')}
          </Button>
          <Button type="button" variant="danger" icon="delete" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t('characters:detail.actions.deleting') : t('characters:detail.actions.delete')}
          </Button>
        </div>
      </header>

      <article className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
        {data.physicalCharacteristics && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('characters:detail.sections.physicalCharacteristics')}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.physicalCharacteristics}</p>
          </section>
        )}
        {data.personality && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('characters:detail.sections.personality')}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.personality}</p>
          </section>
        )}
        {data.history && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('characters:detail.sections.history')}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.history}</p>
          </section>
        )}

        {data.contentTags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('characters:detail.sections.contentTags')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.contentTags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {t(`characters:contentTags.${tag}`)}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.tags && data.tags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('characters:detail.sections.metadata')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.tags.map(tag => (
                <span key={tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>{t('characters:detail.labels.identifier', { id: data.id })}</span>
          <Link to="/characters" className="text-primary underline-offset-2 hover:underline">
            {t('characters:detail.actions.backToHub')}
          </Link>
        </footer>
      </article>
    </section>
  );
}
