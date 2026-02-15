/**
 * FundLens Analytics Service
 * Background usage tracking for application improvement.
 * Wraps the global gtag function initialized in index.html.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    [key: string]: any;
  }
}

const GA_MEASUREMENT_ID = "G-R8TCCRRWTZ";

/**
 * Validates that analytics are available.
 * No longer loads scripts dynamically.
 */
export const initAnalytics = () => {
  if (!window.gtag) {
    console.warn('Analytics: gtag not found on window. Ensure index.html script is loaded.');
    return;
  }
  
  // Optional: Additional runtime configuration can go here
  window.gtag('config', GA_MEASUREMENT_ID, {
    update: true
  });
};

/**
 * Tracks a custom event to GA4.
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (!window.gtag) return;

  try {
    window.gtag('event', eventName, {
      ...params,
      platform: 'web',
      app_name: 'FundLens'
    });
  } catch (e) {
    console.warn('Analytics: Failed to log event', e);
  }
};

/**
 * Tracks manual page views for SPA tab navigation.
 */
export const trackPageView = (pageName: string) => {
  if (!window.gtag) return;

  try {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_path: `/${pageName.toLowerCase()}`
    });
  } catch (e) {
    console.warn('Analytics: Failed to log page view', e);
  }
};