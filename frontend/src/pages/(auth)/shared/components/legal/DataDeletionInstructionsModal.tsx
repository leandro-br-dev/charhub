import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../../components/ui/Modal';

const SUPPORT_EMAIL = 'support@charhub.app';
const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions';

export interface DataDeletionInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataDeletionInstructionsModal({
  isOpen,
  onClose
}: DataDeletionInstructionsModalProps): JSX.Element {
  const { t } = useTranslation('legal');
  const translate = (path: string) => t('legal:dataDeletionPage.' + path);

  const step3Bullets = Array.from({ length: 3 }, (_, index) =>
    translate('section1.step3.bullet' + (index + 1))
  );

  const section2Items = Array.from({ length: 5 }, (_, index) => ({
    title: translate('section2.listItem' + (index + 1) + '.title'),
    text: translate('section2.listItem' + (index + 1) + '.text')
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={translate('title')} size="xl">
      <div className="space-y-6">
        <p className="text-xs text-muted">
          {translate('lastUpdatedLabel')}: <span className="font-semibold text-content">{translate('lastUpdatedDate')}</span>
        </p>

        <p>{translate('introduction')}</p>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section1.title')}</h3>
          <p>{translate('section1.paragraph1')}</p>
          <ol className="ms-4 list-decimal space-y-2 text-left">
            <li>
              {translate('section1.step1.textBeforeLink')}
              <a
                href={'mailto:' + SUPPORT_EMAIL}
                className="text-primary underline-offset-2 transition hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </li>
            <li>{translate('section1.step2')}</li>
            <li>
              {translate('section1.step3.intro')}
              <ul className="ms-4 list-disc space-y-1 text-left">
                {step3Bullets.map((item, index) => (
                  <li key={'data-deletion-step3-' + index}>{item}</li>
                ))}
              </ul>
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section2.title')}</h3>
          <ul className="ms-4 list-disc space-y-2 text-left">
            {section2Items.map((item, index) => (
              <li key={'data-deletion-section2-' + index}>
                <strong>{item.title}</strong> {item.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section3.title')}</h3>
          <p>{translate('section3.paragraph1')}</p>
          <ul className="ms-4 list-disc space-y-2 text-left">
            <li>
              <strong>{translate('section3.listItem1.provider')}</strong>{' '}
              {translate('section3.listItem1.instructionPreLink')}
              <a
                href={GOOGLE_PERMISSIONS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-2 transition hover:underline"
              >
                {translate('section3.listItem1.linkText')}
              </a>
              {translate('section3.listItem1.instructionPostLink')}
            </li>
            <li>
              <strong>{translate('section3.listItem2.provider')}</strong>{' '}
              {translate('section3.listItem2.instruction')}
            </li>
          </ul>
          <p>{translate('section3.paragraph2')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section4.title')}</h3>
          <p>
            {translate('section4.paragraph1Prefix')}{' '}
            <a
              href={'mailto:' + SUPPORT_EMAIL}
              className="text-primary underline-offset-2 transition hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </Modal>
  );
}
