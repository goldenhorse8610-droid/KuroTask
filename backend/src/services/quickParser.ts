export interface ParsedCommand {
    action: 'create_task' | 'start_task' | 'stop_all' | 'help' | 'unknown' | 'message';
    params: {
        name?: string;
        category?: string;
        memo?: string;
        query?: string;
    };
    raw: string;
}

export function parseQuickCommand(input: string): ParsedCommand {
    const trimmed = input.trim();

    // スラッシュコマンドの場合（既存の/start, /stop等は維持）
    if (trimmed.startsWith('/')) {
        const parts = trimmed.split(' ');
        const command = parts[0].toLowerCase();
        const rest = parts.slice(1).join(' ');

        switch (command) {
            case '/start': {
                const query = rest.trim();
                if (!query) return { action: 'unknown', params: {}, raw: trimmed };
                return { action: 'start_task', params: { query }, raw: trimmed };
            }
            case '/stop': return { action: 'stop_all', params: {}, raw: trimmed };
            case '/help': return { action: 'help', params: {}, raw: trimmed };
            case '/task': {
                const categoryMatch = rest.match(/@(\S+)/);
                const category = categoryMatch ? categoryMatch[1] : undefined;
                const name = rest.replace(/@\S+/, '').trim();
                if (!name) return { action: 'unknown', params: {}, raw: trimmed };
                return { action: 'create_task', params: { name, category }, raw: trimmed };
            }
        }
    }

    // スラッシュなし、または未知の入力 -> 直接タスク作成として扱う
    const categoryMatch = trimmed.match(/@(\S+)/);
    const category = categoryMatch ? categoryMatch[1] : 'クイック';
    const name = trimmed.replace(/@\S+/, '').trim();

    if (!name) {
        return { action: 'message', params: {}, raw: trimmed };
    }

    return {
        action: 'create_task',
        params: { name, category },
        raw: trimmed
    };
}
