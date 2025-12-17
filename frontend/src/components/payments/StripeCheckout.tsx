/**
 * Stripe Checkout Component
 *
 * Handles Stripe Elements integration for subscription payments
 */

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';

// Initialize Stripe
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Validate Stripe key is configured
if (!publishableKey) {
  console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY not configured in .env');
}

const stripePromise = loadStripe(publishableKey);

interface StripeCheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function StripeCheckoutForm({ clientSecret, onSuccess, onError }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm payment WITHOUT redirect (process inline)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required', // Only redirect if required by payment method
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao processar pagamento');
        onError(error.message || 'Erro ao processar pagamento');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful, call onSuccess
        onSuccess();
      } else {
        setErrorMessage('Pagamento não foi concluído');
        onError('Pagamento não foi concluído');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao processar pagamento');
      onError(err.message || 'Erro inesperado');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="large"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          'Confirmar Assinatura'
        )}
      </Button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Ao confirmar, você concorda com nossos{' '}
        <a href="/terms" className="text-primary hover:underline">
          Termos de Serviço
        </a>
        .
      </p>
    </form>
  );
}

interface StripeCheckoutProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripeCheckout({ clientSecret, onSuccess, onError }: StripeCheckoutProps) {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);

  useEffect(() => {
    stripePromise.then((stripe) => {
      setStripeInstance(stripe);
    });
  }, []);

  if (!stripeInstance) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Carregando checkout...
        </span>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0070f3',
        colorBackground: '#ffffff',
        colorText: '#1a202c',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="max-w-md mx-auto">
      <Elements stripe={stripeInstance} options={options}>
        <StripeCheckoutForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
