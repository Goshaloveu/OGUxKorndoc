import React, { useMemo } from 'react';
import { Accordion, Alert, Card, Skeleton, Text } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import transform from '@diplodoc/transform';
import { getFAQItems } from '../api/faq';
import type { FAQItem } from '../api/faq';

function renderMarkdown(markdown: string): string {
  return transform(markdown, {
    allowHTML: false,
    linkify: true,
    breaks: true,
    needToSanitizeHtml: true,
    lang: 'ru',
  }).result.html;
}

const FAQAnswer: React.FC<{ item: FAQItem }> = ({ item }) => {
  const html = useMemo(() => renderMarkdown(item.answer), [item.answer]);
  return (
    <div
      style={{ color: 'var(--g-color-text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const FAQPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['faq'],
    queryFn: getFAQItems,
  });

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text variant="display-1" as="h1" style={{ marginBottom: '8px' }}>
          Часто задаваемые вопросы
        </Text>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 56, width: '100%' }} />
          ))}
        </div>
      )}

      {isError && (
        <Alert theme="danger" title="Ошибка" message="Не удалось загрузить часто задаваемые вопросы" />
      )}

      {!isLoading && !isError && (
        <Card view="outlined" style={{ overflow: 'hidden' }}>
          <Accordion view="top-bottom" size="l">
            {(data ?? []).map((item) => (
              <Accordion.Item key={item.id} value={String(item.id)} summary={item.question}>
                <FAQAnswer item={item} />
              </Accordion.Item>
            ))}
          </Accordion>
          {(data ?? []).length === 0 && (
            <div style={{ padding: '1rem' }}>
              <Text variant="body-1" color="secondary">
                FAQ пока не опубликован
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default FAQPage;
