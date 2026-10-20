import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { passwordStrength, passwordStrengthLabel } from '../lib/passwordStrength';

describe('passwordStrength', () => {
  it.each([
    ['', 0],
    ['abc', 1],
    ['abcdefgh', 2],
    ['abcdefgH', 3],
    ['abcdefH1', 4],
    ['abcdefH1!', 5],
  ])('scores %j as %i', (password, score) => {
    expect(passwordStrength(password)).toBe(score);
  });

  it('labels the score', () => {
    expect(passwordStrengthLabel(1)).toBe('Weak');
    expect(passwordStrengthLabel(3)).toBe('Fair');
    expect(passwordStrengthLabel(5)).toBe('Strong');
  });
});

describe('PasswordStrengthMeter', () => {
  it('says nothing is set for an empty password and lists the checks as not met', () => {
    render(<PasswordStrengthMeter password="" />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters/)).toHaveTextContent('(not met)');
  });

  it('shows the level in words and which checks are met', () => {
    render(<PasswordStrengthMeter password="abcdefH1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText(/A symbol/)).toHaveTextContent('(met)');
  });
});
