import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../../components/ui/Modal';

const SUPPORT_EMAIL = 'support@charhub.app';

export interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPrivacy?: () => void;
}

export function TermsOfServiceModal({
  isOpen,
  onClose,
  onNavigateToPrivacy
}: TermsOfServiceModalProps): JSX.Element {
  const { t } = useTranslation('legal');
  const translate = (path: string) => t(`legal:termsOfServicePage.${path}`);

  const acceptableConductItems = Array.from({ length: 5 }, (_, index) =>
    translate(`section1.subSection3.listItem${index + 1}`)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={translate('title')} size="xl">
      <div className="space-y-6">
        <p className="text-xs text-muted">
          {translate('lastUpdatedLabel')}: <span className="font-semibold text-content">{translate('lastUpdatedDate')}</span>
        </p>

        <p>
          {translate('introduction.text1')}{' '}
          {onNavigateToPrivacy ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToPrivacy();
              }}
              className="text-primary underline-offset-2 transition hover:underline"
            >
              {translate('introduction.privacyPolicyLinkText')}
            </button>
          ) : (
            <span className="font-semibold text-primary">
              {translate('introduction.privacyPolicyLinkText')}
            </span>
          )}
          {' '}
          {translate('introduction.text2')}
        </p>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section1.title')}</h3>
          <p>
            <strong>{translate('section1.subSection1.title')}</strong>{' '}
            {translate('section1.subSection1.paragraph1')}
          </p>
          <p>
            <strong>{translate('section1.subSection2.title')}</strong>{' '}
            {translate('section1.subSection2.paragraph1')}
          </p>
          <div>
            <p>
              <strong>{translate('section1.subSection3.title')}</strong>
            </p>
            <p className="mt-1">{translate('section1.subSection3.paragraph1')}</p>
            <ul className="ms-4 mt-2 list-disc space-y-1 text-left">
              {acceptableConductItems.map((item, index) => (
                <li key={`terms-section1-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section2.title')}</h3>
          <p>
            <strong>{translate('section2.subSection1.title')}</strong>{' '}
            {translate('section2.subSection1.paragraph1')}
          </p>
          <p>
            <strong>{translate('section2.subSection2.title')}</strong>{' '}
            {translate('section2.subSection2.paragraph1')}
          </p>
          <p>
            <strong>{translate('section2.subSection3.title')}</strong>{' '}
            {translate('section2.subSection3.paragraph1')}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section3.title')}</h3>
          <p>{translate('section3.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section4.title')}</h3>
          <p>{translate('section4.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section5.title')}</h3>
          <p>{translate('section5.paragraph1')}</p>
          <p>{translate('section5.paragraph2')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section6.title')}</h3>
          <p>{translate('section6.paragraph1')}</p>
          <p>{translate('section6.paragraph2')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section7.title')}</h3>
          <p>{translate('section7.paragraph1')}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-title">{translate('section8.title')}</h3>
          <p>
            {translate('section8.paragraph1Prefix')}{' '}
            <a className="text-primary underline-offset-2 transition hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </Modal>
  );
}
