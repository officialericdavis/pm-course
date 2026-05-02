import { supabase } from '@/utils/supabase/client'

export async function redirectToCheckout() {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId: 'price_1TSelSAZNpuUqk5vk1vE9KfC', // ← your Stripe price ID
      successUrl: `${window.location.origin}/checkout/success`,
      cancelUrl: `${window.location.origin}/checkout/cancel`,
    },
  })

  if (error) throw error
  window.location.href = data.url
}