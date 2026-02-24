import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
export function useTaskQueryParam() {
    const [searchParams, setSearchParams] = useSearchParams();
    const taskId = searchParams.get('task');
    const openTask = useCallback((nextTaskId) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('task', nextTaskId);
        setSearchParams(nextSearchParams, { replace: false });
    }, [searchParams, setSearchParams]);
    const closeTask = useCallback(() => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('task');
        setSearchParams(nextSearchParams, { replace: false });
    }, [searchParams, setSearchParams]);
    return {
        taskId,
        openTask,
        closeTask,
    };
}
//# sourceMappingURL=useTaskQueryParam.js.map