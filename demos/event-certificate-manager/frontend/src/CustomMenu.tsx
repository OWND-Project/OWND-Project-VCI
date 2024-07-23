import { Menu } from "react-admin";
import BadgeIcon from "@mui/icons-material/Badge"; // https://mui.com/material-ui/material-icons/

export const CustomMenu = () => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItems />
  </Menu>
);
