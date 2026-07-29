import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import Constants from 'expo-constants';

export const PRO_ENTITLEMENT = 'pro';

export async function initRevenueCat() {
  const apiKey = Constants.expoConfig?.extra?.revenueCatApiKeyIos ?? '';
  if (!apiKey) {
    console.warn('[RevenueCat] No API key set in app.json extra.revenueCatApiKeyIos');
    return;
  }
  Purchases.configure({ apiKey });
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.error('[RevenueCat] getCustomerInfo error:', e);
    return null;
  }
}

export async function isPro(): Promise<boolean> {
  const info = await getCustomerInfo();
  return info?.entitlements.active[PRO_ENTITLEMENT] != null;
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('[RevenueCat] getOffering error:', e);
    return null;
  }
}

export async function purchasePackage(pkg: any) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] != null;
  } catch (e: any) {
    if (!e.userCancelled) throw e;
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[PRO_ENTITLEMENT] != null;
  } catch (e) {
    console.error('[RevenueCat] restore error:', e);
    return false;
  }
}