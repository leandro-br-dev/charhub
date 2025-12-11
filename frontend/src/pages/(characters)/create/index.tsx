import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/Button';

const AI_GENERATION_COSTS = {
  imageAnalysis: 25,        // Only charged when image is uploaded
  textAnalysis: 15,         // Always charged
  characterEnrichment: 20,  // Always charged
  avatarGeneration: 40,     // Always charged
};

const TOTAL_AI_COST = Object.values(AI_GENERATION_COSTS).reduce((sum, cost) => sum + cost, 0); // 100 credits
const AI_COST_WITHOUT_IMAGE = TOTAL_AI_COST - AI_GENERATION_COSTS.imageAnalysis; // 75 credits

export default function CharacterCreateMethodPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          {t('characters:create.chooseMethod.title', 'How would you like to create your character?')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('characters:create.chooseMethod.subtitle', 'Choose the method that best suits your needs')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-8 hover:shadow-xl transition-shadow border-2 hover:border-blue-500">
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t('characters:create.chooseMethod.manual.title', 'Manual Creation')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('characters:create.chooseMethod.manual.description', 'Create your character step by step with full control over every detail')}
            </p>
            <ul className="space-y-2 mb-6 flex-grow">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.manual.features.0', 'Complete customization')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.manual.features.1', 'Fill in all fields manually')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.manual.features.2', 'Perfect for detailed characters')}</span>
              </li>
            </ul>
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-semibold">
                {t('characters:create.chooseMethod.manual.cost', 'Free')}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => {
                console.log('Manual creation button clicked, navigating to /characters/new');
                navigate('/characters/new');
              }}
              variant="primary"
              className="w-full"
            >
              {t('characters:create.chooseMethod.manual.button', 'Create Manually')}
            </Button>
          </div>
        </Card>

        <Card className="p-8 hover:shadow-xl transition-shadow border-2 hover:border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10">
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('characters:create.chooseMethod.ai.title', 'AI-Powered Creation')}
              </h2>
              <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded uppercase">AI</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('characters:create.chooseMethod.ai.description', 'Let AI generate your character from a description or image')}
            </p>
            <ul className="space-y-2 mb-6 flex-grow">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.ai.features.0', 'Automatic generation')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.ai.features.1', 'Upload image or describe')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{t('characters:create.chooseMethod.ai.features.2', 'Fast and creative')}</span>
              </li>
            </ul>
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-semibold">
                {t('characters:create.chooseMethod.ai.cost', { credits: TOTAL_AI_COST })}
              </span>
            </div>
            <Button type="button" onClick={() => navigate('/characters/create-ai')} variant="primary" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
              {t('characters:create.chooseMethod.ai.button', 'Create with AI')}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          ← {t('common:back', 'Back')}
        </button>
      </div>
    </div>
  );
}
