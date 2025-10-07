import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalAuthLayout } from '../layouts/ExternalAuthLayout';
import { Button } from '../components/ui/Button';

export default function Home(): JSX.Element {
  const { t } = useTranslation(['home', 'common']);

  return (
    <ExternalAuthLayout>
      <div className="flex flex-col justify-center flex-grow -mt-10 md:mt-0">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-title leading-tight">
          {t('home:titleLine1')} <br />
          <span className="text-primary">{t('home:titleLine2Highlight')}</span>
        </h1>
        <p className="text-md sm:text-lg text-content mt-4 max-w-md">
          {t('home:subtitle')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/login" className="flex-1">
          <Button variant="primary" className="uppercase w-full py-3" icon="login">
            {t('home:accessButton')}
          </Button>
        </Link>
        <Link to="/signup" className="flex-1">
          <Button variant="light" className="uppercase w-full py-3" icon="person">
            {t('home:signupButton')}
          </Button>
        </Link>
      </div>
    </ExternalAuthLayout>
  );
}
