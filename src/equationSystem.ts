// Equation evaluation and weapon creation system

import { Equation, EquationComponent, MathConstant, MathOperator, WeaponType, WeaponInstance } from './types.js';
import { getNumberProperties, PROPERTY_RARITY } from './mathUtils.js';

// Evaluate an equation with proper operator precedence
export function evaluateEquation(components: EquationComponent[]): number {
  if (components.length === 0) return 0;

  // Separate constants and operators
  const values: number[] = [];
  const operators: string[] = [];

  for (const component of components) {
    if ('value' in component) {
      values.push(component.value);
    } else if ('symbol' in component) {
      operators.push(component.symbol);
    }
  }

  // Need at least one value
  if (values.length === 0) return 0;
  if (values.length === 1) return Math.round(values[0]);

  // Ensure we have the right number of operators
  if (operators.length !== values.length - 1) {
    console.warn('Invalid equation: mismatch between values and operators');
    return Math.round(values[0]);
  }

  // Apply operator precedence
  // First pass: handle exponentiation (^)
  let result = values[0];
  const workingValues = [...values];
  const workingOperators = [...operators];

  // Pass 1: Handle exponentiation
  for (let i = workingOperators.length - 1; i >= 0; i--) {
    if (workingOperators[i] === '^') {
      const base = workingValues[i];
      const exponent = workingValues[i + 1];
      workingValues[i] = Math.pow(base, exponent);
      workingValues.splice(i + 1, 1);
      workingOperators.splice(i, 1);
    }
  }

  // Pass 2: Handle multiplication and division
  for (let i = 0; i < workingOperators.length; i++) {
    if (workingOperators[i] === '×' || workingOperators[i] === '/') {
      const left = workingValues[i];
      const right = workingValues[i + 1];
      if (workingOperators[i] === '×') {
        workingValues[i] = left * right;
      } else {
        workingValues[i] = right !== 0 ? left / right : left;
      }
      workingValues.splice(i + 1, 1);
      workingOperators.splice(i, 1);
      i--;
    }
  }

  // Pass 3: Handle addition and subtraction
  result = workingValues[0];
  for (let i = 0; i < workingOperators.length; i++) {
    const nextValue = workingValues[i + 1];
    if (workingOperators[i] === '+') {
      result += nextValue;
    } else if (workingOperators[i] === '-') {
      result -= nextValue;
    }
  }

  // Round to nearest integer and cap at 10,000
  return Math.min(10000, Math.max(1, Math.round(result)));
}

// Determine weapon type from evaluated value
// Uses rarity-based hierarchy where rarest properties take priority
export function determineWeaponType(value: number): WeaponType | null {
  const properties = getNumberProperties(value);

  if (properties.length === 0) return null;

  // Sort by rarity (lowest rarity number = highest priority = rarest)
  properties.sort((a, b) => PROPERTY_RARITY[a] - PROPERTY_RARITY[b]);

  // Return rarest property
  return properties[0];
}

// Create a weapon instance from an equation
export function createWeaponFromEquation(equation: Equation, weaponType: WeaponType): WeaponInstance {
  const value = equation.evaluatedValue;

  // Base damage scales with value
  const baseDamage = Math.max(5, Math.floor(value * 2));

  // Cooldown varies by weapon type
  const cooldowns: Record<WeaponType, number> = {
    'one': 800,
    'odds': 1200,
    'evens': 1200,
    'primes': 100, // Aura, continuous
    'fibonacci': 2000, // Burst
    'factorials': 200, // Rapid fire
    'squares': 1500, // Explosion
    'cubes': 1000, // Bouncing
    'biquadrates': 2500 // Piercing beam
  };

  return {
    id: `weapon_${Date.now()}_${Math.random()}`,
    type: weaponType,
    equation,
    level: 1,
    baseDamage,
    cooldown: cooldowns[weaponType],
    cooldownTimer: 0
  };
}
