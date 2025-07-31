const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
    // Create payment intent for loan installment
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                success: true,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                }
            };
        } catch (error) {
            console.error('Stripe payment intent creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Confirm payment intent
    async confirmPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            return {
                success: true,
                data: {
                    status: paymentIntent.status,
                    paymentMethod: paymentIntent.payment_method,
                    amount: paymentIntent.amount / 100 // Convert back to dollars
                }
            };
        } catch (error) {
            console.error('Stripe payment intent confirmation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create customer
    async createCustomer(email, name, metadata = {}) {
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata
            });

            return {
                success: true,
                data: customer
            };
        } catch (error) {
            console.error('Stripe customer creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get payment methods for customer
    async getPaymentMethods(customerId) {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            return {
                success: true,
                data: paymentMethods.data
            };
        } catch (error) {
            console.error('Stripe get payment methods error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create setup intent for saving payment method
    async createSetupIntent(customerId) {
        try {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
            });

            return {
                success: true,
                data: {
                    clientSecret: setupIntent.client_secret,
                    setupIntentId: setupIntent.id
                }
            };
        } catch (error) {
            console.error('Stripe setup intent creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process refund
    async createRefund(paymentIntentId, amount = null) {
        try {
            const refundData = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to cents
            }

            const refund = await stripe.refunds.create(refundData);

            return {
                success: true,
                data: refund
            };
        } catch (error) {
            console.error('Stripe refund creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new StripeService();