// eslint-disable-next-line no-unused-vars
import * as React from "react";
import { useEffect, useState } from "react";
import { Button, Card, CardContent } from "@mui/material";
import { Loading } from "react-admin";
import { useParams } from "react-router-dom";

const apiUrl = process.env.VITE_API_URL || "http://localhost:3000";

const ShowTicketCredentialOfferLink = () => {
  const { ticketNo } = useParams<{ ticketNo: string }>();
  const [credentialOffer, setCredentialOffer] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const resource = `${apiUrl}/vci/credential-offer/ticket/${ticketNo}`;
      const response = await fetch(resource);
      const data = await response.json();
      setCredentialOffer(data.credentialOffer);
    })();
  }, [ticketNo]);

  if (!credentialOffer) {
    return <Loading />;
  }
  const onClick = () => {
    location.href = credentialOffer;
  };

  return (
    <Card>
      <CardContent>
        <h1>チケットVCを発行します</h1>
        <div>
          <p>以下のボタンをタップしてチケットVCを受け取ってください</p>
          <Button variant="contained" onClick={onClick}>
            チケットを受け取る
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { ShowTicketCredentialOfferLink };
