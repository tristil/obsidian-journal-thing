class main {
  constructor(tp, journal_location) {
    this.tp = tp;
    if (tp.file.title === 'Todo') {
      this.today = tp.file.path(true).replace(/.*\/(\d{4}-\d{2}-\d{2})\/Todo\.md/, '$1');
    } else {
      this.today = tp.file.title;
    }
    this.journal_location = journal_location;

    for (const method of Object.getOwnPropertyNames(main.prototype)) {
      if (typeof this[method] === 'function' && method !== 'constructor') {
        this[method] = this[method].bind(this);
      }
    }
  }

  recurring_task(text) {
    return text + ' ➕ ' + this.today + ' 📅 ' + this.today + ' #recurring';
  }

  file_date(string, offset) {
    if (!offset === undefined) {
      offset = 0;
    }
    return this.tp.date.now(string, offset, this.today, 'YYYY-MM-DD');
  }

  build_full_file_path(offset) {
    return this.journal_location + '/' + this.file_date("YYYY/MM/YYYY-MM-DD", offset);
  }

  build_sub_file_path(name, offset) {
    return this.build_full_file_path(offset) + "/" + name
  }

  async create_sub_file(name, content_or_template, offset) {
    return await this.tp.file.create_new(content_or_template, this.build_sub_file_path(name, offset));
  }

  async sub_file_exists(name, offset) {
    return await this.tp.file.exists(this.build_sub_file_path(name, offset) + '.md')
  }

  async fill_in_missing_dates() {
    // Loop through last 10 dates
    for (let i = 1; i <= 9; i++) {
      const filename = this.build_full_file_path(-i) + '.md';
      if (!await this.tp.file.exists(filename)) {
        await this.tp.file.create_new(this.tp.file.find_tfile("Missed Day Template"), filename);
      }
      await this.build_sub_files(-i)
    }
  }

  async build_sub_files(offset) {
    const folder_exists = await this.tp.file.exists(this.build_full_file_path(offset));
    if (!folder_exists) {
      await app.vault.createFolder(this.build_full_file_path(offset));
    }

    if (!await this.sub_file_exists('Todo', offset)) {
      await this.create_sub_file('Todo', this.tp.file.find_tfile("Todo Template"), offset);
    }
    if (!await this.sub_file_exists('Done', offset)) {
      await this.create_sub_file('Done', '', offset);
    }
    if (await this.sub_file_exists('Exercise', offset)) {
      await app.vault.delete(app.vault.getAbstractFileByPath(this.build_sub_file_path('Exercise', offset) + ".md"));
    }

    await this.create_sub_file('Exercise', this.tp.file.find_tfile("Exercise Template"), offset);
  }

  get_todo_files() {
    return app.vault.getFiles()
      .filter(filter => filter.path.startsWith(this.journal_location + '/'))
      .filter(filter => filter.path.endsWith("/Todo.md"))
      .filter(filter => {
        const file_container_date = filter.path.match(/\d{4}-\d{2}-\d{2}/)[0];
        return file_container_date <= this.tp.date.now()
      });
  }

  async get_todos(todo_files) {
    let todos = [];
    for (const file of todo_files) {
      const file_content = await app.vault.read(file);
      const file_todos = file_content.match(/- \[ \] .*/g);
      todos = todos.concat(file_todos);
    };
    return todos;
  }

  async roll_over_todos() {
    if (this.today > this.tp.date.now()) {
      return;
    }

    const todo_files = this.get_todo_files();
    const todos = await this.get_todos(todo_files);

    for (const todo_file of todo_files) {
      const todo_file_content = await app.vault.read(todo_file);
      const completed_todos = todo_file_content.match(/- \[x\] .*/g) || [];
      const file_directory = todo_file.path.substring(0, todo_file.path.lastIndexOf('/'));

      const current_done_file = await this.tp.file.find_tfile(file_directory + '/Done');

      if (completed_todos.length > 0) {
        if (!(await this.tp.file.exists(current_done_file + ".md"))) {
          await this.tp.file.create_new(current_done_file, '');
        }
        await app.vault.append(current_done_file, completed_todos.join("\n"));
      }
      await app.vault.delete(todo_file);

      await this.tp.file.create_new('', todo_file.path.substring(0, todo_file.path.lastIndexOf('.')));
    }

    const current_todo_file = await this.tp.file.find_tfile(this.build_full_file_path() + "/" + 'Todo');
    await app.vault.delete(app.vault.getAbstractFileByPath(this.build_sub_file_path('Todo') + ".md"));
    await this.create_sub_file('Todo', this.tp.file.find_tfile("Todo Template"));
    await app.vault.append(current_todo_file, todos.join("\n"));
  }
}

module.exports = main;
