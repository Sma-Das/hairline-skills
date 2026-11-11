<section id="page-people" data-page="people" hidden>
  <div class="hl-page-head">
    <h1>People</h1>
    <p class="hl-intro">Who spent what in the window above.</p>
  </div>
  <div class="hl-table-tools">
    <input class="hl-input" type="search" id="people-filter" placeholder="Filter people" aria-label="Filter people" />
    <span class="hl-count" id="people-count"></span>
  </div>
  <div class="hl-table-wrap">
    <table class="hl-table">
      <thead>
        <tr>
          <th scope="col">Person</th>
          <th scope="col" data-prio="low">Team</th>
          <th scope="col" class="hl-numeric" data-sort="cents" aria-sort="descending"><button class="hl-sort" type="button">Spend</button></th>
          <th scope="col" class="hl-numeric" data-sort="requests"><button class="hl-sort" type="button">Requests</button></th>
        </tr>
      </thead>
      <tbody id="people-rows"></tbody>
    </table>
  </div>
  <p class="hl-empty" id="people-empty" hidden></p>
</section>
