import {
  Datagrid,
  DateField,
  Labeled,
  List,
  NumberField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  UrlField,
  useRecordContext,
} from "react-admin";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

export const ParticipationList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <ReferenceField source="eventId" reference="events" />
      <DateField source="updatedAt" />
      <NumberField source="authorizedCode.id" />
      <TextField source="credentialOffer" />
    </Datagrid>
  </List>
);
const CodeSnippet = () => {
  const record = useRecordContext();
  if (!record) return null;
  const url = new URL(record["credentialOffer"]);
  const credentialOffer = url.searchParams.get("credential_offer") || "";
  const code = JSON.stringify(JSON.parse(credentialOffer), null, 2);
  return <SyntaxHighlighter language="json">{code}</SyntaxHighlighter>;
};
export const ParticipationShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="eventId" reference="events" />
      <DateField source="updatedAt" />
      <NumberField source="authorizedCode.id" />
      <UrlField source="credentialOffer" />
      <Labeled label="Decoded Credential Offer">
        <CodeSnippet />
      </Labeled>
    </SimpleShowLayout>
  </Show>
);
