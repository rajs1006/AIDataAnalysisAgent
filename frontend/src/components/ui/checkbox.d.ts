import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

export const Checkbox: React.FC<{
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}>;
