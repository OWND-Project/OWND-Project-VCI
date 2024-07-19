import {
  AutocompleteInput,
  Datagrid,
  DateField,
  Labeled,
  List,
  ReferenceField,
  TextField,
  Show,
  SimpleShowLayout,
  SimpleList,
  EditButton,
  Edit,
  Create,
  CreateButton,
  ExportButton,
  SaveButton,
  SimpleForm,
  Toolbar,
  TopToolbar,
  ReferenceInput,
  UrlField,
  useRecordContext,
  required,
  downloadCSV,
} from "react-admin";
// @ts-ignore
import jsonExport from "jsonexport/dist";
import { useMediaQuery, Theme } from "@mui/material";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ImportButton } from "react-admin-import-csv";

const ListActions = (props: any) => {
  return (
    <TopToolbar>
      <CreateButton />
      <ImportButton {...props} />
      <ExportButton />
    </TopToolbar>
  );
};
interface Ticket {
  id: number;
  eventId: number;
  ticketNo: string;
  authorizedCode: {
    id: number;
    code: string;
    expiresIn: number;
    userPin: string;
    usedAt: string;
  };
}
const exporter = (tickets: Ticket[]) => {
  const ticketsForExport = tickets.map((ticket) => {
    const { id, eventId, ticketNo, authorizedCode } = ticket; // omit backlinks and author
    const link = ticketNo2Link(ticketNo);
    return {
      id,
      eventId,
      ticketNo,
      userPin: authorizedCode.userPin,
      link,
      expiresIn: authorizedCode.expiresIn,
      usedAt: authorizedCode.usedAt,
    };
  });
  jsonExport(
    ticketsForExport,
    { forceTextDelimiter: true },
    (err: any, csv: string) => {
      downloadCSV(csv, "tickets");
    }
  );
};

export const TicketList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  return (
    <List actions={<ListActions />} exporter={exporter}>
      {isSmall ? (
        <SimpleList primaryText={(record) => record.ticketNo} />
      ) : (
        <Datagrid rowClick="show">
          <TextField source="id" />
          <ReferenceField source="eventId" reference="events" />
          <TextField source="ticketNo" label="ticket no" />
          <TextField source="authorizedCode.code" label="auth code" />
          <TextField source="authorizedCode.expiresIn" label="expiresIn" />
          <TextField source="authorizedCode.userPin" label="userPin" />
          <DateField source="authorizedCode.createdAt" label="createdAt" />
          <DateField source="updatedAt" label="updatedAt" />
          <DateField source="authorizedCode.usedAt" label="auth code usedAt" />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export const TicketShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="eventId" reference="events" />
      <TextField source="ticketNo" label="ticket no" />
      <TextField source="authorizedCode.code" label="auth code" />
      <TextField source="authorizedCode.expiresIn" label="expiresIn" />
      <TextField source="authorizedCode.userPin" label="userPin" />
      <DateField
        source="authorizedCode.createdAt"
        label="createdAt"
        showTime={true}
      />
      <DateField
        source="authorizedCode.usedAt"
        label="auth code usedAt"
        showTime={true}
      />
      <DateField source="updatedAt" label="updatedAt" showTime={true} />
      <UrlField source="credentialOffer" />
      <Labeled label="Decoded Credential Offer">
        <CodeSnippet />
      </Labeled>
      <Labeled label="Credential Offer Link">
        <CredentialOfferPreLink />
      </Labeled>
    </SimpleShowLayout>
  </Show>
);

const CodeSnippet = () => {
  const record = useRecordContext();
  if (!record) return null;
  const url = new URL(record["credentialOffer"]);
  const credentialOffer = url.searchParams.get("credential_offer") || "";
  const code = JSON.stringify(JSON.parse(credentialOffer), null, 2);
  return <SyntaxHighlighter language="json">{code}</SyntaxHighlighter>;
};

const ticketNo2Link = (ticketNo: string) => {
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}/#/vci/credential-offer/ticket/link/${ticketNo}`;
};

const CredentialOfferPreLink = () => {
  const record = useRecordContext();
  if (!record) return null;
  const ticketNo = record["ticketNo"];
  const link = ticketNo2Link(ticketNo);
  return (
    <a target="_blank" rel="noreferrer" href={link}>
      {link}
    </a>
  );
};

const EditToolbar = () => (
  <Toolbar>
    <SaveButton label="Save" />
  </Toolbar>
);
const optionRenderer = (choice: { id: number; name: string }) =>
  `#${choice.id} ${choice.name}`;
export const TicketEdit = () => (
  <Edit>
    <SimpleForm toolbar={<EditToolbar />}>
      <ReferenceInput source="eventId" reference="events" name="event">
        <AutocompleteInput
          validate={required()}
          optionText={optionRenderer}
          name="event"
        />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

export const TicketCreate = () => (
  <Create>
    <SimpleForm>
      <ReferenceInput source="eventId" reference="events" name="event" />
    </SimpleForm>
  </Create>
);
