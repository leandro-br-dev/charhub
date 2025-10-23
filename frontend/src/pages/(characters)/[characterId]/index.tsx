import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
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
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('characters:detail.states.loading')}</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined text-5xl text-danger">error</span>
        <p>{t('characters:detail.states.notFound')}</p>
        <Button type="button" onClick={() => navigate('/characters')} icon="arrow_back">
          {t('characters:detail.actions.backToHub')}
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-6">
          <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-border bg-input">
            {data.avatar ? (
              <CachedImage src={data.avatar} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-muted">
                <span className="material-symbols-outlined text-5xl">person</span>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-normal/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
              {t(`characters:ageRatings.${data.ageRating}`)}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-semibold text-title">{fullName}</h1>
              {data.style && <p className="mt-1 text-sm text-description">{data.style}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              {data.gender && <span className="rounded-full bg-input px-3 py-1">{data.gender}</span>}
              {data.species && <span className="rounded-full bg-input px-3 py-1">{data.species}</span>}
              <span className="rounded-full bg-input px-3 py-1">
                {data.isPublic ? t('characters:detail.labels.public') : t('characters:detail.labels.private')}
              </span>
            </div>
            <dl className="grid gap-x-8 gap-y-3 text-sm text-content md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  {t('characters:detail.labels.createdAt')}
                </dt>
                <dd>{new Date(data.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
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

      <article className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        {data.physicalCharacteristics && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-title">
              {t('characters:detail.sections.physicalCharacteristics')}
            </h2>
            <p className="text-sm leading-relaxed text-content">{data.physicalCharacteristics}</p>
          </section>
        )}
        {data.personality && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-title">
              {t('characters:detail.sections.personality')}
            </h2>
            <p className="text-sm leading-relaxed text-content">{data.personality}</p>
          </section>
        )}
        {data.history && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-title">
              {t('characters:detail.sections.history')}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-content">{data.history}</p>
          </section>
        )}

        {data.contentTags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-title">
              {t('characters:detail.sections.contentTags')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.contentTags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-input px-3 py-1 text-xs font-medium uppercase tracking-wide text-content"
                >
                  {t(`characters:contentTags.${tag}`)}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.tags && data.tags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-title">
              {t('characters:detail.sections.metadata')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.tags.map(tag => (
                <span key={tag.id} className="rounded-full bg-input px-3 py-1 text-xs text-content">
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted">
          <span>{t('characters:detail.labels.identifier', { id: data.id })}</span>
          <Link to="/characters" className="text-primary underline-offset-2 hover:underline">
            {t('characters:detail.actions.backToHub')}
          </Link>
        </footer>
      </article>
    </section>
  );
}
