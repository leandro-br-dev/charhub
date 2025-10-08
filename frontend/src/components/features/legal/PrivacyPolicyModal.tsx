import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';

const SUPPORT_EMAIL = 'support@charhub.app';

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDataDeletion?: () => void;
}

export function PrivacyPolicyModal({
  isOpen,
  onClose,
  onNavigateToDataDeletion
}: PrivacyPolicyModalProps): JSX.Element {
  const { t } = useTranslation('legal');
  const translate = (path: string) => t(`legal:privacyPolicyPage.${path}`);

  const section2Items = Array.from({ length: 5 }, (_, index) =>
    translate(`section2.listItem${index + 1}`)
  );

  const section3Items = Array.from({ length: 4 }, (_, index) =>
    translate(`section3.listItem${index + 1}`)
  );

  const section6Items = Array.from({ length: 4 }, (_, index) =>
    translate(`section6.listItem${index + 1}`)
  );

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
          <ul className="ms-4 list-disc space-y-3 text-left">
            <li>
              <span className="font-semibold">{translate('section1.listItem1.title')}</span>
              <ul className="ms-4 mt-2 list-disc space-y-1 text-left">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={`privacy-section1-list1-${index}`}>{translate(`section1.listItem1.subItem${index + 1}`)}</li>
                ))}
              </ul>
            </li>
            <li>
              <span className="font-semibold">{translate('section1.listItem2.title')}</span>
              <ul className="ms-4 mt-2 list-disc space-y-1 text-left">
                {Array.from({ length: 2 }, (_, index) => (
                  <li key={`privacy-section1-list2-${index}`}>{translate(`section1.listItem2.subItem${index + 1}`)}</li>
                ))}
              </ul>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section2.title')}</h3>
          <p>{translate('section2.paragraph1')}</p>
          <ul className="ms-4 list-disc space-y-1 text-left">
            {section2Items.map((item, index) => (
              <li key={`privacy-section2-${index}`}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section3.title')}</h3>
          <p>{translate('section3.paragraph1')}</p>
          <ul className="ms-4 list-disc space-y-1 text-left">
            {section3Items.map((item, index) => (
              <li key={`privacy-section3-${index}`}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section4.title')}</h3>
          <p>{translate('section4.paragraph1')}</p>
          <p>{translate('section4.paragraph2')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section5.title')}</h3>
          <p>{translate('section5.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section6.title')}</h3>
          <p>{translate('section6.paragraph1')}</p>
          <ul className="ms-4 list-disc space-y-1 text-left">
            {section6Items.map((item, index) => (
              <li key={`privacy-section6-${index}`}>{item}</li>
            ))}
          </ul>
          <p>{translate('section6.paragraph2')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section7.title')}</h3>
          <p>
            {translate('section7.paragraph1.textBeforeLink')}
            {onNavigateToDataDeletion ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToDataDeletion();
                }}
                className="text-primary underline-offset-2 transition hover:underline"
              >
                {translate('section7.paragraph1.linkText')}
              </button>
            ) : (
              <span className="font-semibold text-primary">
                {translate('section7.paragraph1.linkText')}
              </span>
            )}
            {translate('section7.paragraph1.textAfterLink')}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section8.title')}</h3>
          <p>{translate('section8.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section9.title')}</h3>
          <p>{translate('section9.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section10.title')}</h3>
          <p>
            {translate('section10.paragraph1Prefix')}{' '}
            <a className="text-primary underline-offset-2 transition hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </Modal>
  );
}

