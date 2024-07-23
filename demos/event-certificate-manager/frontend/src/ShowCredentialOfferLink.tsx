// eslint-disable-next-line no-unused-vars
import * as React from "react";
import { useEffect, useState } from "react";
import { Loading } from "react-admin";
import { useParams } from "react-router-dom";
import { Button } from "@mui/material";

const apiUrl = process.env.VITE_API_URL;
const ShowCredentialOfferLink = () => {
  const { id } = useParams<{ id: string }>();
  const [credentialOffer, setCredentialOffer] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const response = await fetch(`${apiUrl}/vci/credential-offer/${id}`);
      const data = await response.json();
      setCredentialOffer(data.credentialOffer);
    })();
  }, [id]);

  if (!credentialOffer) {
    return <Loading />;
  }
  const onClick = () => {
    location.href = credentialOffer;
  };

  return (
    <>
      <h1>イベント参加証を発行します</h1>
      <div>
        <p>以下のボタンをタップして参加証を受け取ってください</p>
        <Button variant="contained" onClick={onClick}>
          参加証を受け取る
        </Button>
      </div>
    </>
  );
};

export { ShowCredentialOfferLink };
