import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import useMediaQuery from '@mui/material/useMediaQuery';

import { api } from '../../app';
import { EVENT_NAMES } from '../../api/events/event-types';

import { HtmlToReact } from './html-to-react';

import { Modal, Button } from '../../ui';
import { inKeyfocusPayload, payloadIsAInKeyfocus } from '../../api/events/payloads/in-keyfocus-payload';

const useStyles = makeStyles((theme) => ({
  trap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: theme.spacing(0),
    left: theme.spacing(0),
    width: '100%',
    height: '100%',
    zIndex: theme.zIndex.focusDialog,
    overflow: 'hidden',
  },
}));

/**
 * Interface for the focus trap properties
 */
interface FocusTrapProps {
  focusTrapId: string;
  callback: (dialogTrap: boolean) => void;
}

/**
 * Create a dialog component to explain to keyboard user how to trigger and remove FocusTrap
 * @param {FocusTrapProps} props the focus trap dialog properties
 * @returns {JSX.Element} the focus trap dialog component
 */
export function FocusTrapDialog(props: FocusTrapProps): JSX.Element {
  const { focusTrapId, callback } = props;

  const defaultTheme = useTheme();
  const classes = useStyles();
  const { t } = useTranslation<string>();

  const fullScreen = useMediaQuery(defaultTheme.breakpoints.down('md'));

  const [open, setOpen] = useState(false);

  /**
   * Exit the focus trap
   */
  function exitFocus(): void {
    const mapElement = document.getElementById(focusTrapId);

    // the user escape the trap, remove it, put back skip link in focus cycle and zoom to top link
    callback(false);
    mapElement?.classList.remove('map-focus-trap');
    mapElement?.querySelectorAll(`a[id*="link-${focusTrapId}"]`).forEach((elem) => elem.setAttribute('tabindex', '0'));
    document.getElementById(`toplink-${focusTrapId}`)?.focus();
  }

  /**
   * Set the focus trap
   */
  function setFocusTrap(): void {
    const mapElement = document.getElementById(focusTrapId);

    // add a class to specify the viewer is in focus trap mode
    mapElement?.classList.add('map-focus-trap');

    // remove the top and bottom link from focus cycle and start the FocusTrap
    mapElement?.querySelectorAll(`a[id*="link-${focusTrapId}"]`).forEach((elem) => elem.setAttribute('tabindex', '-1'));
    callback(true);

    // manage the exit of FocusTrap, remove the trap and focus the top link
    const manageExit = (evt2: KeyboardEvent) => {
      if (evt2.code === 'KeyQ' && evt2.ctrlKey) {
        exitFocus();
        mapElement?.removeEventListener('keydown', manageExit);
      }
    };

    mapElement?.addEventListener('keydown', manageExit);
  }

  const handleEnable = () => {
    setOpen(false);
    setFocusTrap();
  };
  const handleSkip = () => {
    // because the process is about to focus the map, apply a timeout before shifting focus on bottom link
    setOpen(false);
    setTimeout(() => document.getElementById(`bottomlink-${focusTrapId}`)?.focus(), 0);
  };

  /**
   * Manage skip top and bottom link. If user press enter it goes to top link and if he tries to focus the map, it goes to focus dialog
   * @param {KeyboardEvent} evt the keyboard event
   */
  function manageLinks(evt: KeyboardEvent): void {
    // if Enter, skip to the right link (handle the ref of the link)
    // if Tab from topLink or shift+Tab from bottomLink, focus the map element
    const linkId = (evt.target as HTMLElement).id.split('-')[0];

    if ((evt.code === 'Tab' && linkId === 'toplink') || (evt.code === 'Tab' && evt.shiftKey && linkId === 'bottomlink')) {
      // prevent the event to tab to inner map
      evt.preventDefault();
      evt.stopPropagation();

      // focus the map element and emit the map keyboard focus event
      (document.getElementById(`map-${focusTrapId}`) as HTMLElement).focus();
      api.event.emit(inKeyfocusPayload(EVENT_NAMES.MAP.EVENT_MAP_IN_KEYFOCUS, focusTrapId));
    }
  }

  useEffect(() => {
    document.getElementById(`bottomlink-${focusTrapId}`)?.addEventListener('keydown', manageLinks);
    document.getElementById(`toplink-${focusTrapId}`)?.addEventListener('keydown', manageLinks);

    // on map keyboard focus, show focus trap dialog
    api.event.on(
      EVENT_NAMES.MAP.EVENT_MAP_IN_KEYFOCUS,
      (payload) => {
        if (payloadIsAInKeyfocus(payload)) {
          if (payload.handlerName!.includes(focusTrapId)) {
            // when mnap element get focus and focus is not trap, show dialog window
            const mapElement = document.getElementById(focusTrapId);

            if (mapElement && !mapElement.classList.contains('map-focus-trap')) {
              setOpen(true);

              // if user move the mouse over the map, cancel the dialog
              mapElement.addEventListener(
                'mousemove',
                () => {
                  setOpen(false);
                  exitFocus();
                },
                { once: true }
              );
            }
          }
        }
      },
      focusTrapId
    );

    return () => {
      document.getElementById(`bottomlink-${focusTrapId}`)?.removeEventListener('keydown', manageLinks);
      document.getElementById(`toplink-${focusTrapId}`)?.removeEventListener('keydown', manageLinks);
      api.event.off(EVENT_NAMES.MAP.EVENT_MAP_IN_KEYFOCUS, focusTrapId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      container={document.getElementById(focusTrapId)}
      mapId={focusTrapId}
      open={open}
      aria-labelledby="wcag-dialog-title"
      aria-describedby="wcag-dialog-description"
      fullScreen={fullScreen}
      className={classes.trap}
      titleId="wcag-dialog-title"
      title={t('keyboardnav.focusdialog.title')}
      contentTextId="wcag-dialog-description"
      content={<HtmlToReact htmlContent={t('keyboardnav.focusdialog.main')} />}
      actions={
        <>
          <Button
            id="enable-focus"
            tooltip={t('keyboardnav.focusdialog.button.enable')}
            tooltipPlacement="top-end"
            autoFocus
            onClick={handleEnable}
            type="text"
            style={{
              width: 'initial',
            }}
          >
            {t('keyboardnav.focusdialog.button.enable')}
          </Button>
          <Button
            id="skip-focus"
            tooltip={t('keyboardnav.focusdialog.button.skip')}
            tooltipPlacement="top-end"
            onClick={handleSkip}
            type="text"
            style={{
              width: 'initial',
            }}
          >
            {t('keyboardnav.focusdialog.button.skip')}
          </Button>
        </>
      }
    />
  );
}
