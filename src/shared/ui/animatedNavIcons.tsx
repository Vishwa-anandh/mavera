import { AnimatedIcon } from './AnimatedIcon';
import { creditCardAnimation, homeAnimation } from '../../assets/uicons';

/** Thin `ComponentType<{ size?: number }>` wrappers so an animated icon can
 * slot into navConfig.ts's `icon` field exactly like the static icons in
 * src/shared/ui/icons.tsx — hover is delegated to the nav trigger button
 * itself (see AnimatedIcon's hover-ancestor lookup), so hovering anywhere on
 * the nav item plays it, not just the 16px icon glyph. */

export function HomeNavIcon({ size }: { size?: number }) {
  return <AnimatedIcon animation={homeAnimation} size={size} trigger="hover" />;
}

export function CreditCardNavIcon({ size }: { size?: number }) {
  return <AnimatedIcon animation={creditCardAnimation} size={size} trigger="hover" />;
}
