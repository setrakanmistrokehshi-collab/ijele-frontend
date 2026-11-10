import { useEffect, useState } from 'react';
import { isNotFound, toUserMessage } from '../services/httpClient.js';

/** Runs `request` on mount and whenever `deps` change. Returns { status, data, error, notFound }. */
export function useRequest(request, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '', notFound: false });

  useEffect(() => {
    let ignore = false; // drop results that arrive after unmount or a newer request
    setState({ status: 'loading', data: null, error: '', notFound: false });
    request()
      .then((data) => !ignore && setState({ status: 'ready', data, error: '', notFound: false }))
      .catch((error) => !ignore && setState({ status: 'error', data: null, error: toUserMessage(error), notFound: isNotFound(error) }));
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
