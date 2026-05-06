import React from 'react';
import { Accordion, Card, Text } from '@gravity-ui/uikit';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'upload',
    question: 'Какие документы можно загрузить?',
    answer:
      'Сервис принимает PDF, DOCX, XLSX и TXT до 50 МБ. После загрузки документ попадает в очередь обработки и становится доступен в поиске после индексации.',
  },
  {
    id: 'indexing',
    question: 'Почему документ не сразу находится в поиске?',
    answer:
      'После загрузки текст извлекается, разбивается на фрагменты и индексируется в семантической базе. Обычно это занимает до нескольких минут и зависит от размера файла.',
  },
  {
    id: 'access',
    question: 'Кто видит мои документы?',
    answer:
      'Документ видит загрузивший его пользователь, администраторы и те пользователи или организации, которым выдали доступ. Поиск также учитывает эти права.',
  },
  {
    id: 'permissions',
    question: 'Чем отличаются права viewer, editor и owner?',
    answer:
      'Viewer может искать, просматривать и скачивать документ. Editor дополнительно редактирует метаданные. Owner управляет доступами и может удалить документ.',
  },
  {
    id: 'preview',
    question: 'Можно ли посмотреть документ без скачивания?',
    answer:
      'Да. В списке документов и в результатах поиска доступно превью. PDF открывается во встроенном просмотрщике, остальные форматы показываются как извлечённый текст.',
  },
  {
    id: 'search',
    question: 'Как работает семантический поиск?',
    answer:
      'Можно искать не только точные слова, но и смысловые совпадения. В результатах отображаются документы, к которым у вас есть доступ, с фрагментами найденного текста.',
  },
];

const FAQPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Text variant="header-1">FAQ</Text>
        <Text variant="body-1" color="secondary">
          Ответы на частые вопросы по загрузке, поиску и доступам к документам.
        </Text>
      </div>

      <Card view="outlined" style={{ padding: '0.5rem 1rem' }}>
        <Accordion view="top-bottom" size="l" defaultValue={FAQ_ITEMS[0]?.id ?? null}>
          {FAQ_ITEMS.map((item) => (
            <Accordion.Item key={item.id} value={item.id} summary={item.question}>
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
