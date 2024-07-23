// eslint-disable-next-line no-unused-vars
import * as React from "react";
import { useEffect, useState } from "react";
import { Button, Card, CardContent } from "@mui/material";
import { Title, Loading } from "react-admin";
import { QRCodeSVG } from "qrcode.react";

const apiUrl = process.env.VITE_API_URL;
const Events = () => {
  const [authRequest, setAuthRequest] = useState();
  useEffect(() => {
    (async () => {
      const response = await fetch(`${apiUrl}/vp/request`);
      const payload = await response.json();
      setAuthRequest(payload.authRequest);
    })();
  }, []);
  if (!authRequest) {
    return <Loading />;
  }
  const onClick = () => {
    location.href = authRequest;
  };
  return (
    <>
      <h1>チケットVCを検証します</h1>
      <h2>
        検証に成功すると自動的に本日のイベント参加証VCをお受け取りになれます
      </h2>
      <p>
        備つけのモニターでこのページを表示している場合は以下のQRコードから開始してください
      </p>
      <QRCodeSVG value={authRequest} />
      <div>
        <p>
          スマートフォンのブラウザでこのページを表示している場合は以下のボタンから開始してください
        </p>
        <Button variant="contained" onClick={onClick}>
          Open Identity Wallet
        </Button>
      </div>
    </>
  );
};

const VPRequestShow = () => (
  <Card>
    <Title title="Verifiable Presentation Request" />
    <CardContent>
      <Events />
    </CardContent>
  </Card>
);

export { VPRequestShow };
