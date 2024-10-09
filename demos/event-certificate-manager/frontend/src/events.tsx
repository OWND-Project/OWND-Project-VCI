import {
  Datagrid,
  DateField,
  List,
  TextField,
  SimpleList,
  EditButton,
  Edit,
  SimpleForm,
  TextInput,
  DateTimeInput,
  Create,
  required,
} from "react-admin";

import { useMediaQuery, Theme } from "@mui/material";

export const EventList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  return (
    <List>
      {isSmall ? (
        <SimpleList
          primaryText={(record) => record.name}
          secondaryText={(record) => record.date}
        />
      ) : (
        <Datagrid rowClick="show">
          <TextField source="id" sortable={false} />
          <TextField source="name" sortable={false} />
          <TextField source="description" sortable={false} />
          <TextField source="location" sortable={false} />
          <DateField source="startDate" sortable={true} />
          <DateField source="endDate" sortable={false} />
          <TextField source="url" sortable={false} />
          <TextField source="organizerName" sortable={false} />
          <TextField source="organizerUrl" sortable={false} />
          <DateField source="createdAt" sortable={false} />
          <DateField source="updatedAt" sortable={false} />
          <EditButton />
        </Datagrid>
      )}
    </List>
  );
};

export const EventEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" name={"id"} disabled={true} />
      <TextInput source="name" name={"name"} validate={required()} />
      <TextInput source="description" name={"description"} />
      <TextInput source="location" name={"location"} />
      <DateTimeInput
        source="startDate"
        name={"startDate"}
        validate={required()}
      />
      <DateTimeInput source="endDate" name={"endDate"} validate={required()} />
      <TextInput source="url" name={"url"} />
      <TextInput
        source="organizerName"
        name={"organizerName"}
        validate={required()}
      />
      <TextInput source="organizerUrl" name={"organizerUrl"} />
      <DateTimeInput source="createdAt" name={"createdAt"} disabled={true} />
      <DateTimeInput source="updatedAt" name={"updatedAt"} disabled={true} />
    </SimpleForm>
  </Edit>
);

export const EventCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" name={"name"} validate={required()} />
      <TextInput source="description" name={"description"} />
      <TextInput source="location" name={"location"} />
      <DateTimeInput
        source="startDate"
        name={"startDate"}
        validate={required()}
      />
      <DateTimeInput source="endDate" name={"endDate"} validate={required()} />
      <TextInput source="url" name={"url"} />
      <TextInput
        source="organizerName"
        name={"organizerName"}
        validate={required()}
      />
      <TextInput source="organizerUrl" name={"organizerUrl"} />
    </SimpleForm>
  </Create>
);
