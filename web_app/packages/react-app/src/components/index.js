import styled from "styled-components";
// import { ThemeOptions } from '@material-ui/core/styles/createMuiTheme';

export const themeOptions = {
  palette: {
    type: 'dark',
    primary: {
      main: '#124125',
    },
    secondary: {
      main: '#ffc400',
    },
    background: {
      default: '#0c180c',
      paper: '#303939',
    },
    text: {
      primary: '#ffffff',
    },
  },
};

export const Header = styled.header`
  background-color: ${themeOptions.palette.primary.main};
  min-height: 70px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  color: white;
`;

export const Body = styled.div`
  align-items: center;
  background-color: ${themeOptions.palette.background.default};
  color: white;
  display: flex;
  flex-direction: row;
  font-size: calc(10px + 2vmin);
  justify-content: center;
  min-height: calc(100vh - 70px);
  font-family: Inter;
`;

export const Col = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: column;
  font-size: calc(10px + 2vmin);
  justify-content: center;
  min-height: calc(100vh - 70px);
  font-family: Inter;
  margin-left: 8px;
  margin-right: 8px;
`;

export const Image = styled.img`
  height: 30vmin;
  margin-top: 24px;
  margin-bottom: 8px;
  margins: 4px 0px
  pointer-events: none;
`;

export const Title = styled.p`
  color: ${themeOptions.palette.secondary.main};
  margin-top: 8px;
  margin-bottom: 8px;
  margin-left: 8px;
  font-size: calc(12px + 2vmin);
  font-family: 'Press Start 2P';
`;

export const Text = styled.p`
  color: white;
  padding: 0px 8px;
  font-size: calc(4px + 2vmin);
  font-family: Quicksand;
`;

export const Link = styled.a.attrs({
  target: "_blank",
  rel: "noopener noreferrer",
})`
  color: ${themeOptions.palette.secondary.main};
  margin-top: 8px;
  margin-bottom: 8px;
  font-size: 10px;
  font-family: "Press Start 2P";
`;

export const Button = styled.button`
  background-color: ${themeOptions.palette.primary.main};
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  text-align: center;
  text-decoration: none;
  margin: 0px 20px;
  padding: 10px 14px;
  margin-top: 8px;
  margin-bottom: 8px;
  font-family: Quicksand;

  ${props => props.hidden && "hidden"} :focus {
    border: none;
    outline: none;
  }
`;
