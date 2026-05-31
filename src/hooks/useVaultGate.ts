import { useState } from 'react';

const VAULT_KEY = 'lovcore_has_entered';

export const useVaultGate = () => {
  const [hasEnteredVault, setHasEnteredVault] = useState(() => {
    return localStorage.getItem(VAULT_KEY) === 'true';
  });

  const enterVault = () => {
    localStorage.setItem(VAULT_KEY, 'true');
    setHasEnteredVault(true);
  };

  const exitVault = () => {
    localStorage.removeItem(VAULT_KEY);
    setHasEnteredVault(false);
  };

  return {
    hasEnteredVault,
    enterVault,
    exitVault,
  };
};
