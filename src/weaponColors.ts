// Consistent color scheme for weapon types throughout the game

import { WeaponType } from './types.js';

export const WEAPON_COLORS: Record<WeaponType, string> = {
  'one': '#fff',           // White - Base/neutral
  'odds': '#ff0',          // Yellow - Odd numbers
  'evens': '#0ff',         // Cyan - Even numbers
  'primes': '#f0f',        // Magenta - Prime numbers
  'fibonacci': '#fa0',     // Orange - Fibonacci sequence
  'factorials': '#f44',    // Red - Factorials
  'squares': '#8f8',       // Light green - Perfect squares
  'cubes': '#88f',         // Blue - Perfect cubes
  'biquadrates': '#f8f'    // Pink - Fourth powers
};

export function getWeaponColor(type: WeaponType): string {
  return WEAPON_COLORS[type] || '#fff';
}

export function getWeaponTypeDisplay(type: WeaponType): string {
  const displays: Record<WeaponType, string> = {
    'one': 'One',
    'odds': 'Odds',
    'evens': 'Evens',
    'primes': 'Primes',
    'fibonacci': 'Fibonacci',
    'factorials': 'Factorials',
    'squares': 'Squares',
    'cubes': 'Cubes',
    'biquadrates': 'Biquadrates'
  };
  return displays[type] || type;
}
