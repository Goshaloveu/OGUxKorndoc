import React from 'react';
import { Accordion, Card, Text } from '@gravity-ui/uikit';
import { useTranslation } from '../i18n';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_IDS = Array.from({ length: 14 }, (_, index) => index + 1);

const FAQPage: React.FC = () => {
  const t = useTranslation('faqPage');
  const faqItems: FAQItem[] = FAQ_IDS.map((id) => ({
    question: t(`q${id}`),
    answer: t(`a${id}`),
  }));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text variant="display-1" as="h1" style={{ marginBottom: '8px' }}>
          {t('title')}
        </Text>
      </div>

      <Card view="outlined" style={{ overflow: 'hidden' }}>
        <Accordion view="top-bottom" size="l">
          {faqItems.map((item) => (
            <Accordion.Item key={item.question} value={item.question} summary={item.question}>
              <Text variant="body-2" color="secondary">
                {item.answer}
              </Text>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card>
    </div>
  );
};

export default FAQPage;
