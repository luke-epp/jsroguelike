// Mathematical utility functions for number property detection

import { WeaponType } from './types.js';

// Check if a number is prime
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;

  const sqrt = Math.sqrt(n);
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Check if a number is in the Fibonacci sequence
export function isFibonacci(n: number): boolean {
  if (n < 0) return false;
  if (n === 0 || n === 1) return true;

  let a = 0, b = 1;
  while (b < n) {
    const temp = b;
    b = a + b;
    a = temp;
  }
  return b === n;
}

// Check if a number is a factorial (1!, 2!, 3!, ...)
export function isFactorial(n: number): boolean {
  if (n < 1) return false;
  if (n === 1 || n === 2) return true;

  let factorial = 1;
  let i = 2;
  while (factorial < n) {
    i++;
    factorial *= i;
  }
  return factorial === n;
}

// Check if a number is a perfect square
export function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const sqrt = Math.sqrt(n);
  return sqrt === Math.floor(sqrt);
}

// Check if a number is a perfect cube
export function isPerfectCube(n: number): boolean {
  const cubeRoot = Math.round(Math.cbrt(n));
  return cubeRoot * cubeRoot * cubeRoot === n;
}

// Check if a number is a biquadrate (n^4)
export function isBiquadrate(n: number): boolean {
  if (n < 1) return false;
  const fourthRoot = Math.pow(n, 1/4);
  const rounded = Math.round(fourthRoot);
  return Math.pow(rounded, 4) === n;
}

// Check if a number is odd
export function isOdd(n: number): boolean {
  return n % 2 !== 0;
}

// Check if a number is even
export function isEven(n: number): boolean {
  return n % 2 === 0 && n !== 0;
}

// Get all properties of a number
export function getNumberProperties(n: number): WeaponType[] {
  const properties: WeaponType[] = [];

  // Check in priority order
  if (n === 1) {
    properties.push('one');
  }
  if (isPrime(n)) {
    properties.push('primes');
  }
  if (isFibonacci(n)) {
    properties.push('fibonacci');
  }
  if (isFactorial(n)) {
    properties.push('factorials');
  }
  if (isPerfectSquare(n)) {
    properties.push('squares');
  }
  if (isPerfectCube(n)) {
    properties.push('cubes');
  }
  if (isBiquadrate(n)) {
    properties.push('biquadrates');
  }
  if (isEven(n)) {
    properties.push('evens');
  }
  if (isOdd(n)) {
    properties.push('odds');
  }

  return properties;
}

// Calculate rarity multiplier based on number of properties
export function calculateRarityMultiplier(properties: WeaponType[]): number {
  const count = properties.length;
  if (count >= 4) return 1.3;
  if (count === 3) return 1.2;
  if (count === 2) return 1.1;
  return 1.0;
}
