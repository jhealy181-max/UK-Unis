import React from 'react';

export default function SkillTag({ name, variant = 'default' }) {
  return <span className={`skill-tag skill-tag-${variant}`}>{name}</span>;
}
