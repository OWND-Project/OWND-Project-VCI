import { Admin, Resource, ShowGuesser, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";

import simpleRestProvider from "ra-data-simple-rest";
import { fetchUtils } from "ra-core";

import authProvider from "./authProvider";
import { CustomLayout } from "./CustomLayout";
import { Dashboard } from "./Dashboard";
import { VPRequestShow } from "./VPRequestShow";
import { EventList, EventEdit, EventCreate } from "./events";
import { TicketList, TicketShow, TicketEdit, TicketCreate } from "./tickets";
import { ShowCredentialOfferLink } from "./ShowCredentialOfferLink";
import { ShowTicketCredentialOfferLink } from "./ShowTicketCredentialOfferLink";
import { ParticipationList, ParticipationShow } from "./Participation";

const appName = "event-certificate-manager";
const apiUrl = process.env.VITE_API_URL != null ? process.env.VITE_API_URL : "";

// for session
const fetchJson = (url: string, options: fetchUtils.Options = {}) => {
  const customHeaders = (options.headers ||
    new Headers({
      Accept: "application/json",
    })) as Headers;
  // add your own headers here
  options.credentials = "include"; // クッキーを送信するために追加
  options.headers = customHeaders;
  return fetchUtils.fetchJson(url, options);
};

// https://github.com/marmelab/react-admin/tree/master/packages/ra-data-simple-rest#note-about-content-range
const dataProvider = simpleRestProvider(
  `${apiUrl}/admin/${appName}`,
  fetchJson,
  "X-Total-Count"
);

export const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    dashboard={Dashboard}
    layout={CustomLayout}
  >
    <Resource
      name="events"
      list={EventList}
      create={EventCreate}
      edit={EventEdit}
      show={ShowGuesser}
      recordRepresentation="name"
    />
    <Resource
      name="tickets"
      list={TicketList}
      show={TicketShow}
      edit={TicketEdit}
      create={TicketCreate}
    />
    <Resource
      name="participation"
      list={ParticipationList}
      show={ParticipationShow}
    />
    <CustomRoutes noLayout>
      <Route
        path="/vci/credential-offer/:id"
        element={<ShowCredentialOfferLink />}
      />
      <Route
        path="/vci/credential-offer/ticket/link/:ticketNo"
        element={<ShowTicketCredentialOfferLink />}
      />
      <Route path="/vp/requests" element={<VPRequestShow />} />
    </CustomRoutes>
  </Admin>
);
